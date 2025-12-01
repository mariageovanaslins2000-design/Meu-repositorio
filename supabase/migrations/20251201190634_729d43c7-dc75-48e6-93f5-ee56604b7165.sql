-- Update link_client_to_barbershop function to work with appointments.client_id referencing clients.id

CREATE OR REPLACE FUNCTION public.link_client_to_barbershop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Buscar o profile_id a partir do client_id (clients.id)
  SELECT profile_id
  INTO v_profile_id
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Se existir profile_id, cria o vínculo na client_barbershop
  IF v_profile_id IS NOT NULL THEN
    INSERT INTO public.client_barbershop (profile_id, barbershop_id)
    VALUES (v_profile_id, NEW.barbershop_id)
    ON CONFLICT (profile_id, barbershop_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;