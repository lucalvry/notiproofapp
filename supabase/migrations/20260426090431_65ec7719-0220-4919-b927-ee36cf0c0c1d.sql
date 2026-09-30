-- Enable required extensions for scheduled HTTP calls.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Remove any prior version of this job before re-creating.
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-widget-events-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

SELECT cron.schedule(
  'cleanup-widget-events-daily',
  '15 3 * * *', -- daily at 03:15 UTC
  $$
  SELECT net.http_post(
    url := 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/cleanup-widget-events',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHZ4d3doaGR6aWhqcGhsb2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDc4ODYsImV4cCI6MjA5MjUyMzg4Nn0.4KA6X09LurY3t44Nw6HOahQ1tRQcws7l_dVK8revll0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);