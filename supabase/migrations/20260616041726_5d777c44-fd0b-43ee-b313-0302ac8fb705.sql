
-- Revoke EXECUTE on internal trigger / background functions (not meant to be API-callable)
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.set_updated_at()',
    'public.hash_proof_author_email()',
    'public.business_domains_normalize()',
    'public.enforce_domain_limit()',
    'public.enforce_active_widget_limit()',
    'public.enforce_seat_limit_on_member()',
    'public.enforce_seat_limit_on_invite()',
    'public.increment_widget_interaction()',
    'public.increment_proof_content_count()',
    'public.decrement_proof_content_count()',
    'public.tg_call_campaign_evaluator()',
    'public.tg_campaign_increment_response()',
    'public.tg_proof_auto_generate_content()',
    'public.sync_proof_product_denorm()',
    'public.tg_call_enrich_product_images()',
    'public.sync_integration_provider_columns()',
    'public.sync_proof_type_columns()',
    'public.retry_failed_product_image_enrichment()',
    'public.check_rate_limit(text,integer,integer)',
    'public.cleanup_rate_limits()',
    'public.update_proof_media_metadata(uuid,bigint,numeric)',
    'public.generate_agency_approval_token()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Explicit deny-all policies on internal tables so the linter sees a policy
-- and the Data API blocks all access. Service role bypasses RLS.
DROP POLICY IF EXISTS "no api access" ON public.app_secrets;
CREATE POLICY "no api access" ON public.app_secrets
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no api access" ON public.rate_limits;
CREATE POLICY "no api access" ON public.rate_limits
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no api access" ON public.url_fetch_cache;
CREATE POLICY "no api access" ON public.url_fetch_cache
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Also revoke direct table grants so even the deny policy is unreachable
REVOKE ALL ON public.app_secrets FROM anon, authenticated;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
REVOKE ALL ON public.url_fetch_cache FROM anon, authenticated;
