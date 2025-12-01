import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string }>;
}

async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Missing Google Service Account credentials');
  }

  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
  
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimSetBase64 = btoa(JSON.stringify(claimSet)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerBase64}.${claimSetBase64}`;

  // Import private key
  const pemContents = formattedPrivateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureBase64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function createEvent(calendarId: string, event: GoogleCalendarEvent, accessToken: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  return await response.json();
}

async function listEvents(calendarId: string, timeMin: string, timeMax: string, accessToken: string) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list events: ${error}`);
  }

  return await response.json();
}

async function deleteEvent(calendarId: string, eventId: string, accessToken: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 410) {
    const error = await response.text();
    throw new Error(`Failed to delete event: ${error}`);
  }

  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { action, ...params } = await req.json();
    const accessToken = await getGoogleAccessToken();

    let result;

    switch (action) {
      case 'createEvent': {
        const { calendarId, event } = params;
        result = await createEvent(calendarId, event, accessToken);
        break;
      }

      case 'listEvents': {
        const { calendarId, timeMin, timeMax } = params;
        result = await listEvents(calendarId, timeMin, timeMax, accessToken);
        break;
      }

      case 'getAvailableTimes': {
        const { barberId, date, serviceDuration } = params;
        
        // Get barber's calendar ID
        const { data: barber } = await supabase
          .from('barbers')
          .select('google_calendar_id')
          .eq('id', barberId)
          .single();

        if (!barber?.google_calendar_id) {
          throw new Error('Barber does not have a Google Calendar configured');
        }

        // Get barbershop working hours
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('opening_time, closing_time')
          .eq('id', (await supabase.from('barbers').select('barbershop_id').eq('id', barberId).single()).data?.barbershop_id)
          .single();

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const events = await listEvents(
          barber.google_calendar_id,
          startOfDay.toISOString(),
          endOfDay.toISOString(),
          accessToken
        );

        // Generate available times
        const openingHour = parseInt(barbershop?.opening_time?.split(':')[0] || '9');
        const closingHour = parseInt(barbershop?.closing_time?.split(':')[0] || '18');
        const availableTimes: string[] = [];

        for (let hour = openingHour; hour < closingHour; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const slotStart = new Date(date);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

            // Check if slot conflicts with existing events
            const hasConflict = events.items?.some((event: any) => {
              if (!event.start?.dateTime || !event.end?.dateTime) return false;
              const eventStart = new Date(event.start.dateTime);
              const eventEnd = new Date(event.end.dateTime);
              return (slotStart < eventEnd && slotEnd > eventStart);
            });

            if (!hasConflict && slotEnd.getHours() <= closingHour) {
              availableTimes.push(timeString);
            }
          }
        }

        result = { availableTimes };
        break;
      }

      case 'deleteEvent': {
        const { calendarId, eventId } = params;
        result = await deleteEvent(calendarId, eventId, accessToken);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Google Calendar error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
