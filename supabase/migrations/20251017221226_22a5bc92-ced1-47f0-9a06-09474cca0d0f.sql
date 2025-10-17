-- Create financial records table
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  valor_total NUMERIC NOT NULL,
  comissao_percent NUMERIC NOT NULL,
  comissao_valor NUMERIC NOT NULL,
  valor_liquido_barbearia NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can manage their financial records"
ON public.financial_records FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.id = financial_records.barbershop_id
    AND barbershops.owner_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_financial_records_updated_at
BEFORE UPDATE ON public.financial_records
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();