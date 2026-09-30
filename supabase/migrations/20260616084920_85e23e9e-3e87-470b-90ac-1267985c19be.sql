
-- system_alerts: cross-system alerts shown in admin Overview tab
CREATE TABLE public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('critical','warning','info')),
  domain text NOT NULL,
  alert_key text NOT NULL,
  message text NOT NULL,
  link_tab text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX system_alerts_active_key ON public.system_alerts (alert_key) WHERE resolved_at IS NULL;
CREATE INDEX system_alerts_created_idx ON public.system_alerts (created_at DESC);

GRANT SELECT, UPDATE ON public.system_alerts TO authenticated;
GRANT ALL ON public.system_alerts TO service_role;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read alerts" ON public.system_alerts FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins resolve alerts" ON public.system_alerts FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- analytics_snapshots: pre-computed admin overview payloads
CREATE TABLE public.analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  scope text NOT NULL DEFAULT 'admin_overview',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_snapshots_scope_date_idx ON public.analytics_snapshots (scope, snapshot_date DESC);

GRANT SELECT ON public.analytics_snapshots TO authenticated;
GRANT ALL ON public.analytics_snapshots TO service_role;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read snapshots" ON public.analytics_snapshots FOR SELECT TO authenticated USING (public.is_platform_admin());

-- ef_invocation_log: Edge Function instrumentation
CREATE TABLE public.ef_invocation_log (
  id bigserial PRIMARY KEY,
  function_name text NOT NULL,
  business_id uuid,
  status text NOT NULL CHECK (status IN ('success','error')),
  duration_ms integer,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ef_invocation_log_fn_time_idx ON public.ef_invocation_log (function_name, created_at DESC);
CREATE INDEX ef_invocation_log_time_idx ON public.ef_invocation_log (created_at DESC);

GRANT SELECT ON public.ef_invocation_log TO authenticated;
GRANT ALL ON public.ef_invocation_log TO service_role;
ALTER TABLE public.ef_invocation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read EF log" ON public.ef_invocation_log FOR SELECT TO authenticated USING (public.is_platform_admin());

-- backfill_jobs: enrichment backfill job runs
CREATE TABLE public.backfill_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  attempted integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX backfill_jobs_created_idx ON public.backfill_jobs (created_at DESC);

GRANT SELECT ON public.backfill_jobs TO authenticated;
GRANT ALL ON public.backfill_jobs TO service_role;
ALTER TABLE public.backfill_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read backfill jobs" ON public.backfill_jobs FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE TRIGGER backfill_jobs_updated_at BEFORE UPDATE ON public.backfill_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_active_alerts()
RETURNS TABLE(id uuid, severity text, domain text, alert_key text, message text, link_tab text, metadata jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, severity, domain, alert_key, message, link_tab, metadata, created_at
  FROM public.system_alerts
  WHERE resolved_at IS NULL AND public.is_platform_admin()
  ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_alert(_alert_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.system_alerts
    SET resolved_at = now(), resolved_by = auth.uid()
    WHERE id = _alert_id AND resolved_at IS NULL;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.admin_latest_snapshot(_scope text DEFAULT 'admin_overview')
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT payload FROM public.analytics_snapshots
  WHERE scope = _scope AND public.is_platform_admin()
  ORDER BY snapshot_date DESC, created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_pg_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, active boolean, last_start timestamptz, last_status text, last_duration_ms integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, cron AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY
  SELECT j.jobid, j.jobname, j.schedule, j.active,
         r.start_time AS last_start,
         r.status AS last_status,
         CASE WHEN r.end_time IS NOT NULL AND r.start_time IS NOT NULL
              THEN EXTRACT(EPOCH FROM (r.end_time - r.start_time))::integer * 1000
              ELSE NULL END AS last_duration_ms
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT start_time, end_time, status FROM cron.job_run_details
    WHERE jobid = j.jobid ORDER BY start_time DESC LIMIT 1
  ) r ON true
  ORDER BY j.jobname;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_active_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_latest_snapshot(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pg_cron_jobs() TO authenticated;
