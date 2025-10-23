-- Create policy to allow public read access to barbershop name for client signup
CREATE POLICY "Public can view barbershop name for signup"
ON public.barbershops
FOR SELECT
USING (true);