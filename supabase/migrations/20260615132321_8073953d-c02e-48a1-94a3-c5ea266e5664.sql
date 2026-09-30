-- Case studies: slug unique per business (partial index so multiple NULLs remain allowed)
CREATE UNIQUE INDEX IF NOT EXISTS case_studies_business_slug_uniq
  ON public.case_studies (business_id, slug)
  WHERE slug IS NOT NULL;

-- Publishing channels: document Phase 2 spec deviations.
-- The Phase 2 specification uses different field names than the implementation.
-- We keep the implementation names for backwards compatibility with existing data
-- and edge functions. The mapping is:
--   spec.channel_type   -> public.publishing_channels.provider
--   spec.display_name   -> public.publishing_channels.account_label
--   spec.access_token   -> public.publishing_channels.credentials_encrypted
--                          (Vault-style AES-GCM encrypted bytea, decrypted only
--                           inside edge functions via _shared/pii-crypto.ts)
-- Phase 2 additions (already present):
--   external_account_id text  - provider-side account id (e.g. Buffer user id)
--   token_expires_at timestamptz - OAuth access-token expiry for refresh flows
COMMENT ON TABLE public.publishing_channels IS
  'Phase 2 publishing channel connections. Spec deviations: provider=channel_type, account_label=display_name, credentials_encrypted=access_token (AES-GCM at rest).';
COMMENT ON COLUMN public.publishing_channels.provider IS
  'Spec name: channel_type. Provider enum (buffer, mailchimp, klaviyo, convertkit, linkedin, twitter, ...).';
COMMENT ON COLUMN public.publishing_channels.account_label IS
  'Spec name: display_name. Human-readable label shown in the UI.';
COMMENT ON COLUMN public.publishing_channels.credentials_encrypted IS
  'Spec name: access_token. AES-GCM encrypted JSON blob; decrypt only in edge functions via _shared/pii-crypto.ts.';
COMMENT ON COLUMN public.publishing_channels.external_account_id IS
  'Phase 2: provider-side account id (e.g. Buffer user id) used to disambiguate multi-account connections.';
COMMENT ON COLUMN public.publishing_channels.token_expires_at IS
  'Phase 2: OAuth access-token expiry. NULL means no expiry / not applicable.';