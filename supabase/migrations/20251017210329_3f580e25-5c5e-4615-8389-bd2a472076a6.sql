-- Create storage bucket for barbershop logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Create policies for logo uploads
CREATE POLICY "Owners can upload their barbershop logo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their barbershop logo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete their barbershop logo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');