import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  phoneNumber: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Missing required environment variables');
    }

    const { phoneNumber, message }: SendMessageRequest = await req.json();

    if (!phoneNumber || !message) {
      throw new Error('phoneNumber and message are required');
    }

    console.log('[WhatsApp Send] Sending message to:', phoneNumber);

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE_NAME)}`,
      {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: message
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WhatsApp Send] Evolution API error:', errorText);
      throw new Error(`Failed to send message: ${errorText}`);
    }

    const result = await response.json();
    console.log('[WhatsApp Send] Message sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        result 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[WhatsApp Send] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
