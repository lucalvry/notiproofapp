-- Reschedule (idempotent): drop any prior schedule with this name, then create.
DO $$
DECLARE jid integer;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'dispatch-scheduled-jobs-every-minute';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'dispatch-scheduled-jobs-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/dispatch-scheduled-jobs',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHZ4d3doaGR6aWhqcGhsb2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDc4ODYsImV4cCI6MjA5MjUyMzg4Nn0.4KA6X09LurY3t44Nw6HOahQ1tRQcws7l_dVK8revll0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);