-- Allow owners to delete appointments from their barbershop
CREATE POLICY "Owners can delete their barbershop appointments"
ON public.appointments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.id = appointments.barbershop_id
    AND barbershops.owner_id = auth.uid()
  )
);