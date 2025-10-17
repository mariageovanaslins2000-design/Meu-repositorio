-- Create clients table to track customer activity
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  last_appointment_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barbershop_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can manage their clients"
ON public.clients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.id = clients.barbershop_id
    AND barbershops.owner_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their own record"
ON public.clients FOR SELECT
USING (profile_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();