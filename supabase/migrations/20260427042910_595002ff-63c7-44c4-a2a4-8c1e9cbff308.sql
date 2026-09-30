-- Seed the dispatch cron secret (idempotent).
INSERT INTO public.app_secrets (name, value)
VALUES ('dispatch_cron_secret', 'dcb3c8ea988b879030517d1d4a8dcecc964014b49218e8bd07e58a4ab6862536')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Drop any prior schedule with this name, then create a new one that sends
-- the cron secret as the Bearer token instead of the anon key.
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
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM public.app_secrets WHERE name = 'dispatch_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
