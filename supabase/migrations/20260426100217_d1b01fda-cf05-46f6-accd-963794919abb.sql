CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing schedule if re-running
DO $$
BEGIN
  PERFORM cron.unschedule('send-testimonial-reminders-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'send-testimonial-reminders-hourly',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/send-testimonial-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHZ4d3doaGR6aWhqcGhsb2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDc4ODYsImV4cCI6MjA5MjUyMzg4Nn0.4KA6X09LurY3t44Nw6HOahQ1tRQcws7l_dVK8revll0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);