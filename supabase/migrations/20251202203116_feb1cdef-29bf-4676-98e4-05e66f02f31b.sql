-- Create a secure function to get only public barbershop info for signup
CREATE OR REPLACE FUNCTION public.get_barbershop_public_info(barbershop_id uuid)
RETURNS TABLE (id uuid, name text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.logo_url
  FROM public.barbershops b
  WHERE b.id = barbershop_id;
$$;

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view barbershop name for signup" ON public.barbershops;