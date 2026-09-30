-- P0 Fix: Add RLS policy for webhook_dedup table
DROP POLICY IF EXISTS "Service role can manage webhook dedup" ON public.webhook_dedup;
CREATE POLICY "Service role can manage webhook dedup"
ON public.webhook_dedup
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- P0 Fix: Secure database functions with proper search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION public.user_has_org_role(_user_id uuid, _org_id uuid, _roles team_role[]) SET search_path = public;

-- P2 Fix: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_action_date 
ON public.audit_logs(admin_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_widget_approved_date 
ON public.events(widget_id, moderation_status, created_at DESC) 
WHERE moderation_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_widgets_website_status 
ON public.widgets(website_id, status);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_widget_active 
ON public.visitor_sessions(widget_id, is_active, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_heatmap_clicks_widget_date 
ON public.heatmap_clicks(widget_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_items_connector_status 
ON public.social_items(connector_id, moderation_status, created_at DESC);