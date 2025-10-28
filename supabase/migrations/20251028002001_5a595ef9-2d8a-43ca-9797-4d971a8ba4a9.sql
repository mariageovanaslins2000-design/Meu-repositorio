-- Create whatsapp_conversations table to track conversation state
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  conversation_state JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster phone number lookups
CREATE INDEX idx_whatsapp_phone ON public.whatsapp_conversations(phone_number);

-- Create index for barbershop lookups
CREATE INDEX idx_whatsapp_barbershop ON public.whatsapp_conversations(barbershop_id);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view their barbershop conversations
CREATE POLICY "Owners can view their barbershop conversations"
  ON public.whatsapp_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbershops
      WHERE barbershops.id = whatsapp_conversations.barbershop_id
        AND barbershops.owner_id = auth.uid()
    )
  );

-- Policy: System can manage all conversations (for edge functions)
CREATE POLICY "System can manage conversations"
  ON public.whatsapp_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();