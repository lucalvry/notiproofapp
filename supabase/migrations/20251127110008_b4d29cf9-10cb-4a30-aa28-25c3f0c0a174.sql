-- Create RPC function to get active visitor count for a specific widget
CREATE OR REPLACE FUNCTION public.get_active_visitor_count(_widget_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT session_id)::integer
    FROM visitor_sessions
    WHERE widget_id = _widget_id
      AND is_active = true
      AND last_seen_at > NOW() - INTERVAL '5 minutes'
  );
END;
$$;

-- Create RPC function to get active visitor count for an entire website
CREATE OR REPLACE FUNCTION public.get_active_visitor_count_for_site(_website_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT vs.session_id)::integer
    FROM visitor_sessions vs
    JOIN widgets w ON w.id = vs.widget_id
    WHERE w.website_id = _website_id
      AND vs.is_active = true
      AND vs.last_seen_at > NOW() - INTERVAL '5 minutes'
  );
END;
$$;