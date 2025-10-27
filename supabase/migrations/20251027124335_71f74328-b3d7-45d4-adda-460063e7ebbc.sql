-- Parte 1: Corrigir nomes dos clientes existentes
UPDATE public.clients c
SET name = p.full_name,
    phone = p.phone
FROM public.profiles p
WHERE c.profile_id = p.id
  AND (c.name = 'Cliente' OR c.name IS NULL OR c.name = '');

-- Parte 2: Criar função para sincronizar cliente quando vinculado à barbearia
CREATE OR REPLACE FUNCTION public.sync_client_on_barbershop_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Buscar informações do perfil
  SELECT full_name, phone 
  INTO v_profile
  FROM public.profiles
  WHERE id = NEW.profile_id;
  
  -- Inserir ou atualizar registro em clients
  INSERT INTO public.clients (
    barbershop_id,
    profile_id,
    name,
    phone,
    total_visits
  )
  VALUES (
    NEW.barbershop_id,
    NEW.profile_id,
    COALESCE(v_profile.full_name, 'Cliente'),
    v_profile.phone,
    0
  )
  ON CONFLICT (barbershop_id, profile_id) 
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, clients.name),
    phone = COALESCE(EXCLUDED.phone, clients.phone);
  
  RETURN NEW;
END;
$$;

-- Criar trigger para sincronizar automaticamente
CREATE TRIGGER sync_client_after_barbershop_link
  AFTER INSERT ON public.client_barbershop
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_on_barbershop_link();

-- Corrigir clientes existentes que já têm vínculo mas não estão na tabela clients
INSERT INTO public.clients (barbershop_id, profile_id, name, phone, total_visits)
SELECT 
  cb.barbershop_id,
  cb.profile_id,
  COALESCE(p.full_name, 'Cliente'),
  p.phone,
  0
FROM public.client_barbershop cb
JOIN public.profiles p ON p.id = cb.profile_id
LEFT JOIN public.clients c ON c.profile_id = cb.profile_id AND c.barbershop_id = cb.barbershop_id
WHERE c.id IS NULL
ON CONFLICT (barbershop_id, profile_id) DO NOTHING;