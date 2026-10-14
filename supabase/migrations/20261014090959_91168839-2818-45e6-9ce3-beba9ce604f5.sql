INSERT INTO public.app_secrets(name, value) VALUES ('EF_RETRY_AI_JOBS_URL', 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/retry-ai-jobs')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

DO $$
DECLARE job_id integer;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'notiproof-retry-ai-jobs';
  IF job_id IS NOT NULL THEN PERFORM cron.unschedule(job_id); END IF;
  PERFORM cron.schedule(
    'notiproof-retry-ai-jobs',
    '15 * * * *',
    $cron$
    SELECT net.http_post(
      url := COALESCE((SELECT value FROM public.app_secrets WHERE name='EF_RETRY_AI_JOBS_URL'),''),
      headers := jsonb_build_object('Content-Type','application/json',
        'x-internal-secret', COALESCE((SELECT value FROM public.app_secrets WHERE name='INTERNAL_TRIGGER_SECRET'),'')),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;