-- Token-bucket style rate limit storage. Service role only.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket_window
  ON public.rate_limits (bucket_key, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: service role only, RLS denies everything else.

-- Atomic check-and-increment. Returns true if under limit, false if exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max integer,
  _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window timestamptz;
  _new_count integer;
BEGIN
  -- Bucket the current time into a fixed window.
  _window := to_timestamp(
    (floor(extract(epoch FROM now()) / GREATEST(_window_seconds, 1)) * GREATEST(_window_seconds, 1))
  );

  INSERT INTO public.rate_limits (bucket_key, window_start, count)
  VALUES (_key, _window, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _new_count;

  RETURN _new_count <= GREATEST(_max, 1);
END;
$$;

-- Cleanup helper: drops buckets older than 1 day.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 day';
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;