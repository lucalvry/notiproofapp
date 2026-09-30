REVOKE EXECUTE ON FUNCTION public.admin_active_alerts() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_latest_snapshot(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_pg_cron_jobs() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_alert(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_agency_team_invitation(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.retry_failed_product_image_enrichment() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_active_alerts(), public.admin_latest_snapshot(text), public.admin_pg_cron_jobs(), public.admin_resolve_alert(uuid), public.accept_agency_team_invitation(text), public.retry_failed_product_image_enrichment() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_call_campaign_evaluator() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_call_enrich_product_images() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_proof_auto_generate_content() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_proof_product_denorm() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_proof_media_metadata(uuid, bigint, numeric) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.update_proof_media_metadata(uuid, bigint, numeric), public.cleanup_rate_limits(), public.check_rate_limit(text, integer, integer) TO service_role;