-- Atualizar role do usuário atual para owner
UPDATE public.user_roles 
SET role = 'owner'
WHERE user_id = '620f02c1-2798-45ac-8fa6-0961ce2e4af4';

-- Criar barbearia para o usuário
INSERT INTO public.barbershops (owner_id, name)
VALUES ('620f02c1-2798-45ac-8fa6-0961ce2e4af4', 'Minha Barbearia');