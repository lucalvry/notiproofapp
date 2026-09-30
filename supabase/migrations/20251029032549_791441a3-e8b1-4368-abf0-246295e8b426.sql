-- Remove old active visitor tracking functions
-- These are replaced by GA4 Realtime API integration

DROP FUNCTION IF EXISTS public.get_active_visitor_count(_widget_id uuid);
DROP FUNCTION IF EXISTS public.get_active_visitor_count_for_site(_website_id uuid);

-- Keep visitor_sessions table for analytics but add comment
COMMENT ON TABLE public.visitor_sessions IS 'Historical session tracking for analytics. Active visitor counts now provided by GA4 Realtime API.';