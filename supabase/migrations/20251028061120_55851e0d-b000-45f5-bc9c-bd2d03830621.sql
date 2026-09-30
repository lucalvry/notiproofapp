-- Create webhook deduplication table
CREATE TABLE IF NOT EXISTS public.webhook_dedup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  webhook_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_webhook_dedup_key ON public.webhook_dedup(idempotency_key);
CREATE INDEX idx_webhook_dedup_created ON public.webhook_dedup(created_at);

-- RLS: Only service role can manage
ALTER TABLE public.webhook_dedup ENABLE ROW LEVEL SECURITY;

-- Cleanup function (delete records older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_webhook_dedup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM webhook_dedup 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;