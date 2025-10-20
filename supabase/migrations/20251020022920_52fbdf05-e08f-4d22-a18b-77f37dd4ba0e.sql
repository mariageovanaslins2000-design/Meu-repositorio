-- Create client_barbershop table to link clients to their barbershops
CREATE TABLE IF NOT EXISTS public.client_barbershop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, barbershop_id)
);

-- Enable RLS
ALTER TABLE public.client_barbershop ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_barbershop
CREATE POLICY "Users can view their own barbershop links"
ON public.client_barbershop
FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own barbershop links"
ON public.client_barbershop
FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Update handle_new_user function to create client_barbershop link when client signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
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
    )
    RETURNING id INTO v_barbershop_id;
    
    -- Link owner to their own barbershop as client
    INSERT INTO public.client_barbershop (profile_id, barbershop_id)
    VALUES (NEW.id, v_barbershop_id);
  ELSIF (NEW.raw_user_meta_data->>'barbershop_id') IS NOT NULL THEN
    -- If barbershop_id is provided during signup, link the client
    INSERT INTO public.client_barbershop (profile_id, barbershop_id)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'barbershop_id')::UUID)
    ON CONFLICT (profile_id, barbershop_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to get user's barbershop_id
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id 
  FROM public.client_barbershop 
  WHERE profile_id = user_id 
  LIMIT 1;
$$;

-- Update RLS policies to use barbershop isolation

-- Services: Clients can only view services from their barbershop
DROP POLICY IF EXISTS "Clients can view active services" ON public.services;
CREATE POLICY "Clients can view active services"
ON public.services
FOR SELECT
USING (
  is_active = true AND (
    has_role(auth.uid(), 'client'::app_role) AND 
    barbershop_id = public.get_user_barbershop_id(auth.uid())
  )
);

-- Barbers: Clients can only view barbers from their barbershop
DROP POLICY IF EXISTS "Clients can view active barbers" ON public.barbers;
CREATE POLICY "Clients can view active barbers"
ON public.barbers
FOR SELECT
USING (
  is_active = true AND (
    has_role(auth.uid(), 'client'::app_role) AND 
    barbershop_id = public.get_user_barbershop_id(auth.uid())
  )
);

-- Portfolio: Clients can only view portfolio from their barbershop
DROP POLICY IF EXISTS "Portfolio images are publicly viewable" ON public.portfolio_images;
CREATE POLICY "Clients can view their barbershop portfolio"
ON public.portfolio_images
FOR SELECT
USING (
  barbershop_id = public.get_user_barbershop_id(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE barbershops.id = portfolio_images.barbershop_id 
    AND barbershops.owner_id = auth.uid()
  )
);

-- Barbershops: Clients can only view their linked barbershop
DROP POLICY IF EXISTS "Clients can view barbershops" ON public.barbershops;
CREATE POLICY "Clients can view their barbershop"
ON public.barbershops
FOR SELECT
USING (
  id = public.get_user_barbershop_id(auth.uid()) OR
  owner_id = auth.uid()
);

-- Appointments: Update to ensure proper barbershop isolation
DROP POLICY IF EXISTS "Clients can create their own appointments" ON public.appointments;
CREATE POLICY "Clients can create their own appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  auth.uid() = client_id AND 
  has_role(auth.uid(), 'client'::app_role) AND
  barbershop_id = public.get_user_barbershop_id(auth.uid())
);