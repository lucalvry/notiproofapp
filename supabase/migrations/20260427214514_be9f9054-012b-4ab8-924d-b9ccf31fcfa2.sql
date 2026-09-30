-- 1. Add 'agency' to business_plan enum (keep 'scale' for legacy rows; the
--    earlier rename migration already moved data over but the enum itself
--    was never extended — without this, code setting plan='agency' fails.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'business_plan' AND e.enumlabel = 'agency'
  ) THEN
    ALTER TYPE public.business_plan ADD VALUE 'agency';
  END IF;
END $$;

-- 2. Add missing columns on integration_events that the UI / webhooks reference.
ALTER TABLE public.integration_events
  ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_event_id text,
  ADD COLUMN IF NOT EXISTS business_id uuid,
  ADD COLUMN IF NOT EXISTS proof_object_id uuid;

-- Backfill received_at from created_at for existing rows.
UPDATE public.integration_events
   SET received_at = created_at
 WHERE received_at IS NULL OR received_at = '1970-01-01'::timestamptz;

-- Backfill business_id from parent integration where missing.
UPDATE public.integration_events e
   SET business_id = i.business_id
  FROM public.integrations i
 WHERE e.integration_id = i.id
   AND e.business_id IS NULL;

-- Backfill status from existing processed flag.
UPDATE public.integration_events
   SET status = CASE
                  WHEN processed = true AND error_message IS NULL THEN 'processed'
                  WHEN processed = true AND error_message IS NOT NULL THEN 'failed'
                  WHEN error_message IS NOT NULL THEN 'failed'
                  ELSE 'received'
                END
 WHERE status = 'received';

-- Allowed status values.
ALTER TABLE public.integration_events
  DROP CONSTRAINT IF EXISTS integration_events_status_check;
ALTER TABLE public.integration_events
  ADD CONSTRAINT integration_events_status_check
  CHECK (status IN ('received','processing','processed','failed','duplicate','retrying'));

-- Per-integration uniqueness on external_event_id (used by webhook dedup).
CREATE UNIQUE INDEX IF NOT EXISTS integration_events_unique_external
  ON public.integration_events(integration_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_events_status_received
  ON public.integration_events(status, received_at DESC);

-- 3. Admin replay function: resets a single event so it is re-processed.
CREATE OR REPLACE FUNCTION public.admin_replay_integration_event(_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can replay integration events';
  END IF;

  UPDATE public.integration_events
     SET processed = false,
         processed_at = NULL,
         error_message = NULL,
         status = 'retrying',
         attempts = COALESCE(attempts, 0) + 1
   WHERE id = _event_id
   RETURNING true INTO v_exists;

  RETURN COALESCE(v_exists, false);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_replay_integration_event(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_replay_integration_event(uuid) TO authenticated;