-- Add encrypted storage columns
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS author_email_encrypted bytea;

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS credentials_encrypted bytea;

-- Audit log for PII access
CREATE TABLE IF NOT EXISTS public.pii_encryption_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  business_id uuid,
  resource_table text NOT NULL,
  resource_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('encrypt','decrypt','clear','backfill')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pii_audit_resource
  ON public.pii_encryption_audit (resource_table, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pii_audit_actor
  ON public.pii_encryption_audit (actor_user_id, created_at DESC);

ALTER TABLE public.pii_encryption_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view PII audit"
  ON public.pii_encryption_audit
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- Inserts only via service role (edge functions); no INSERT/UPDATE/DELETE policy for authenticated users.