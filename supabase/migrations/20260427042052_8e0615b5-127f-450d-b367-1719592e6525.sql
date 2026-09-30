-- ============================================================================
-- Security hardening migration
-- ============================================================================

-- 1) integrations: hide raw credentials/api_token from authenticated clients.
--    Members keep SELECT on safe columns; sensitive columns are only readable
--    by the service role (used by edge functions like integration-credentials).
REVOKE SELECT (credentials, api_token) ON public.integrations FROM authenticated;
REVOKE SELECT (credentials, api_token) ON public.integrations FROM anon;

-- 2) scheduled_jobs: payload may contain customer email + metadata.
--    Limit row visibility to platform admins only; business owners/editors
--    should manage requests via testimonial_requests, not the queue table.
DROP POLICY IF EXISTS sj_member_select ON public.scheduled_jobs;
CREATE POLICY sj_admin_select ON public.scheduled_jobs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 3) testimonials storage bucket: lock down upload/update/delete.
--    Anonymous uploads must go through the bunny-upload edge function with a
--    valid collection_token; dashboard users continue to use authenticated paths.
DROP POLICY IF EXISTS "Authenticated users can upload testimonial media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own testimonial media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own testimonial media" ON storage.objects;

CREATE POLICY "Authenticated users can upload testimonial media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'testimonials'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own testimonial media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'testimonials'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own testimonial media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'testimonials'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Lock down SECURITY DEFINER helpers from anon where they should not be
--    callable without auth. Keep public collection helpers anon-callable.
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_business_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_business(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_team_invitation(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.mark_business_onboarding_complete(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.business_plan_usage(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.business_integration_stats(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_overview_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_daily_series(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_integration_health() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_replay_integration_event(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_add_domain(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_activate_widget(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_create_proof(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_invite_seat(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_upload_media(uuid, bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_proof_media_metadata(uuid, bigint, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_placeholder_proof_for_request(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_widget_analytics(uuid, timestamptz, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_top_proof_performance(uuid, timestamptz, timestamptz, integer) FROM anon, public;
