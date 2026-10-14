-- ---- 1. businesses: widget_last_seen_at -------------------------------------
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS widget_last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_businesses_widget_last_seen_at ON public.businesses(widget_last_seen_at);

-- ---- 2. email_sends ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  template text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_sends_business ON public.email_sends(business_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user_template ON public.email_sends(user_id, template);
CREATE INDEX IF NOT EXISTS idx_email_sends_business_template ON public.email_sends(business_id, template);
CREATE INDEX IF NOT EXISTS idx_email_sends_created_at ON public.email_sends(created_at DESC);

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_sends FROM anon, authenticated;
GRANT ALL ON public.email_sends TO service_role;

-- ---- 3. email_unsubscribes ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_unsubscribes FROM anon, authenticated;
GRANT ALL ON public.email_unsubscribes TO service_role;

-- ---- 4. Admin RPC to list recent email sends ----------------------------------
CREATE OR REPLACE FUNCTION public.admin_recent_email_sends(p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, business_id uuid, user_id uuid, email text, template text, meta jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY
  SELECT es.id, es.business_id, es.user_id, es.email, es.template, es.meta, es.created_at
  FROM public.email_sends es
  ORDER BY es.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 100), 500);
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_recent_email_sends(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_recent_email_sends(integer) TO authenticated, service_role;

-- ---- 5. Register edge function URLs for pg_cron dispatch ----------------------
INSERT INTO public.app_secrets (name, value) VALUES
  ('EF_INSTALL_RECHECK_URL', 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/install-recheck'),
  ('EF_LIFECYCLE_MAILER_URL', 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/lifecycle-mailer')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ---- 6. pg_cron schedules ------------------------------------------------------
DO $$
DECLARE job_id integer;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'notiproof-install-recheck';
  IF job_id IS NOT NULL THEN PERFORM cron.unschedule(job_id); END IF;

  PERFORM cron.schedule(
    'notiproof-install-recheck',
    '0 4 * * *',
    $cron$
    SELECT net.http_post(
      url := COALESCE((SELECT value FROM public.app_secrets WHERE name='EF_INSTALL_RECHECK_URL'),''),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-internal-secret', COALESCE((SELECT value FROM public.app_secrets WHERE name='INTERNAL_TRIGGER_SECRET'),'')
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;

DO $$
DECLARE job_id integer;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'notiproof-lifecycle-mailer';
  IF job_id IS NOT NULL THEN PERFORM cron.unschedule(job_id); END IF;

  PERFORM cron.schedule(
    'notiproof-lifecycle-mailer',
    '0 13 * * *',
    $cron$
    SELECT net.http_post(
      url := COALESCE((SELECT value FROM public.app_secrets WHERE name='EF_LIFECYCLE_MAILER_URL'),''),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-internal-secret', COALESCE((SELECT value FROM public.app_secrets WHERE name='INTERNAL_TRIGGER_SECRET'),'')
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;