-- Drop existing restrictive policies on clients table
DROP POLICY IF EXISTS "Owners can manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view their own record" ON public.clients;

-- Create proper permissive policies

-- Owners can manage clients of their own barbershop only
CREATE POLICY "Owners can manage their clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.barbershops
    WHERE barbershops.id = clients.barbershop_id
    AND barbershops.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.barbershops
    WHERE barbershops.id = clients.barbershop_id
    AND barbershops.owner_id = auth.uid()
  )
);

-- Clients can only view their own record
CREATE POLICY "Clients can view their own record"
ON public.clients
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());