-- Fix appointments.client_id to reference clients.id instead of auth.users profile_id

-- Step 1: Drop the existing foreign key constraint FIRST
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

-- Step 2: Update all appointments to use clients.id instead of profile_id
UPDATE public.appointments a
SET client_id = c.id
FROM public.clients c
WHERE a.client_id = c.profile_id;

-- Step 3: Add new foreign key constraint referencing clients.id
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Step 4: Drop existing client RLS policies
DROP POLICY IF EXISTS "Clients can create their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;

-- Step 5: Create new RLS policies that work with clients table reference
CREATE POLICY "Clients can create their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = appointments.client_id 
    AND clients.profile_id = auth.uid()
  )
  AND has_role(auth.uid(), 'client'::app_role) 
  AND barbershop_id = get_user_barbershop_id(auth.uid())
);

CREATE POLICY "Clients can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = appointments.client_id 
    AND clients.profile_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = appointments.client_id 
    AND clients.profile_id = auth.uid()
  )
);