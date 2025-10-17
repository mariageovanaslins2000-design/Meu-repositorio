-- Adicionar role de client para o usuário poder acessar ambas as áreas
INSERT INTO public.user_roles (user_id, role)
VALUES ('620f02c1-2798-45ac-8fa6-0961ce2e4af4', 'client')
ON CONFLICT (user_id, role) DO NOTHING;