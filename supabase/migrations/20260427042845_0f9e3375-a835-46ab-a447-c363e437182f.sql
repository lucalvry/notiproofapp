-- Internal secrets table for backend-only values (e.g. cron auth token).
CREATE TABLE IF NOT EXISTS public.app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- No policies are created => all access from the anon/authenticated roles is
-- denied. Only the service role (which bypasses RLS) can read/write.
REVOKE ALL ON public.app_secrets FROM anon, authenticated;

CREATE TRIGGER trg_app_secrets_updated_at
  BEFORE UPDATE ON public.app_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
