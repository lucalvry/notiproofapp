CREATE TABLE public.ai_job_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  user_id uuid,
  task text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reported_by_user boolean NOT NULL DEFAULT false,
  user_note text,
  attempts int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, UPDATE ON public.ai_job_failures TO authenticated;
GRANT ALL ON public.ai_job_failures TO service_role;
ALTER TABLE public.ai_job_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai failures" ON public.ai_job_failures FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Owners read own ai failures" ON public.ai_job_failures FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins update ai failures" ON public.ai_job_failures FOR UPDATE TO authenticated USING (public.is_platform_admin());
CREATE INDEX ai_job_failures_status_idx ON public.ai_job_failures(status, created_at);

-- Users report a failure to the admin (only their own row).
CREATE OR REPLACE FUNCTION public.report_ai_failure(_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ai_job_failures SET reported_by_user = true, user_note = left(_note, 1000), updated_at = now()
  WHERE id = _id AND user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.report_ai_failure(uuid, text) TO authenticated;