-- ============================================
-- ACTIVE VISITORS FEATURE - Database Enhancement
-- ============================================

-- Add index for fast active session counting
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_active_lookup 
ON visitor_sessions(widget_id, is_active, last_seen_at) 
WHERE is_active = true;

-- Create function to get active visitor count for a widget
CREATE OR REPLACE FUNCTION get_active_visitor_count(_widget_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM visitor_sessions
  WHERE widget_id = _widget_id
    AND is_active = true
    AND last_seen_at > NOW() - INTERVAL '2 minutes';
$$;

-- Create function to get active visitor count for a website (site mode)
CREATE OR REPLACE FUNCTION get_active_visitor_count_for_site(_website_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT session_id)::integer
  FROM visitor_sessions vs
  JOIN widgets w ON w.id = vs.widget_id
  WHERE w.website_id = _website_id
    AND vs.is_active = true
    AND vs.last_seen_at > NOW() - INTERVAL '2 minutes';
$$;

-- ============================================
-- GENERIC WEBHOOK FEATURE - Database Enhancement
-- ============================================

-- Add 'webhook' and 'zapier' to integration_type enum
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'webhook';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'zapier';