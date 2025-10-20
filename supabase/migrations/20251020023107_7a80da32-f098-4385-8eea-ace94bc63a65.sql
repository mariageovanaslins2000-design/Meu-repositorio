-- Link existing clients to barbershops based on their appointments
INSERT INTO public.client_barbershop (profile_id, barbershop_id)
SELECT DISTINCT 
  a.client_id as profile_id,
  a.barbershop_id
FROM public.appointments a
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_barbershop cb
  WHERE cb.profile_id = a.client_id 
  AND cb.barbershop_id = a.barbershop_id
)
ON CONFLICT (profile_id, barbershop_id) DO NOTHING;

-- Create trigger to automatically link client to barbershop when appointment is created
CREATE OR REPLACE FUNCTION public.link_client_to_barbershop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create client_barbershop link if it doesn't exist
  INSERT INTO public.client_barbershop (profile_id, barbershop_id)
  VALUES (NEW.client_id, NEW.barbershop_id)
  ON CONFLICT (profile_id, barbershop_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS link_client_on_appointment ON public.appointments;
CREATE TRIGGER link_client_on_appointment
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.link_client_to_barbershop();