-- Add google_calendar_id field to barbers table
ALTER TABLE public.barbers 
ADD COLUMN google_calendar_id TEXT;