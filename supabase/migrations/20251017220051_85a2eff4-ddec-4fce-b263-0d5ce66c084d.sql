-- Create storage buckets for barber photos and portfolio
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('barber-photos', 'barber-photos', true),
  ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for barber photos
CREATE POLICY "Barber photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'barber-photos');

CREATE POLICY "Owners can upload barber photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barber-photos' AND
  auth.uid() IN (SELECT owner_id FROM barbershops)
);

CREATE POLICY "Owners can update barber photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barber-photos' AND
  auth.uid() IN (SELECT owner_id FROM barbershops)
);

CREATE POLICY "Owners can delete barber photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barber-photos' AND
  auth.uid() IN (SELECT owner_id FROM barbershops)
);

-- Storage policies for portfolio
CREATE POLICY "Portfolio images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "Owners can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' AND
  auth.uid() IN (SELECT owner_id FROM barbershops)
);

CREATE POLICY "Owners can update portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio' AND
  auth.uid() IN (SELECT owner_id FROM barbershops)
);

CREATE POLICY "Owners can delete portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio' AND
  auth.uid() IN (SELECT owner_id FROM barbershops)
);

-- Create portfolio_images table
CREATE TABLE IF NOT EXISTS public.portfolio_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on portfolio_images
ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

-- Portfolio images policies
CREATE POLICY "Portfolio images are publicly viewable"
ON public.portfolio_images FOR SELECT
USING (true);

CREATE POLICY "Owners can manage their portfolio images"
ON public.portfolio_images FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.id = portfolio_images.barbershop_id
    AND barbershops.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.id = portfolio_images.barbershop_id
    AND barbershops.owner_id = auth.uid()
  )
);

-- Create trigger for portfolio_images updated_at
CREATE TRIGGER update_portfolio_images_updated_at
BEFORE UPDATE ON public.portfolio_images
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();