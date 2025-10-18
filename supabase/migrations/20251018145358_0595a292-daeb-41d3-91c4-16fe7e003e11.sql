-- Update handle_new_user function to give both owner and client roles to barbershop owners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  -- Create role based on metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client')
  );
  
  -- If owner, also give client role so they can access both panels
  IF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
    -- Add client role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create barbershop
    INSERT INTO public.barbershops (owner_id, name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add client role retroactively to all existing owners
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'client'::app_role
FROM public.user_roles
WHERE role = 'owner'
ON CONFLICT (user_id, role) DO NOTHING;