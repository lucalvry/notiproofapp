-- 1. Drop legacy proof_type enum if it still lingers (columns are already text)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proof_type' AND typnamespace = 'public'::regnamespace) THEN
    -- Make sure no column actually depends on it before dropping
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE udt_schema = 'public' AND udt_name = 'proof_type'
    ) THEN
      EXECUTE 'DROP TYPE public.proof_type';
    END IF;
  END IF;
END $$;

-- 2. Admin integration health RPC
CREATE OR REPLACE FUNCTION public.admin_integration_health()
RETURNS TABLE (
  integration_id uuid,
  business_id uuid,
  business_name text,
  provider text,
  status text,
  last_sync_at timestamptz,
  events_24h bigint,
  processed_24h bigint,
  unprocessed_24h bigint,
  success_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id AS integration_id,
    i.business_id,
    b.name AS business_name,
    COALESCE(i.provider, i.platform::text) AS provider,
    i.status::text,
    i.last_sync_at,
    COALESCE(s.events_24h, 0) AS events_24h,
    COALESCE(s.processed_24h, 0) AS processed_24h,
    COALESCE(s.unprocessed_24h, 0) AS unprocessed_24h,
    CASE
      WHEN COALESCE(s.events_24h, 0) = 0 THEN NULL
      ELSE ROUND((COALESCE(s.processed_24h, 0)::numeric / s.events_24h::numeric) * 100, 1)
    END AS success_rate
  FROM public.integrations i
  JOIN public.businesses b ON b.id = i.business_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)                                                   AS events_24h,
      COUNT(*) FILTER (WHERE e.processed_at IS NOT NULL)         AS processed_24h,
      COUNT(*) FILTER (WHERE e.processed_at IS NULL)             AS unprocessed_24h
    FROM public.integration_events e
    WHERE e.integration_id = i.id
      AND e.received_at > now() - interval '24 hours'
  ) s ON TRUE
  WHERE public.is_admin(auth.uid())
  ORDER BY i.last_sync_at DESC NULLS LAST, b.name ASC;
$$;

REVOKE ALL ON FUNCTION public.admin_integration_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_integration_health() TO authenticated;

-- 3. Force PostgREST to reload its schema cache so old enum metadata is dropped
NOTIFY pgrst, 'reload schema';