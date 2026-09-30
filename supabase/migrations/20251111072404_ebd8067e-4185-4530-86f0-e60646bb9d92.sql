-- PHASE 4: Setup Cron Job for Announcement Processing
-- Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule announcement processor to run every 5 minutes
SELECT cron.schedule(
  'process-announcements',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/process-announcements',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eW12eGhwa3N3aHNpcmRyanViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTY0NDksImV4cCI6MjA3MDU3MjQ0OX0.ToRbUm37-ZnYkmmCfLW7am38rUGgFAppNxcZ2tar9mc"}'::jsonb
  ) as request_id;
  $$
);