INSERT INTO public.app_secrets (name, value) VALUES
  ('EF_CAMPAIGN_EVALUATOR_URL', 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/campaign-trigger-evaluator'),
  ('EF_SCHEDULED_EMAIL_SENDER_URL', 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/scheduled-email-sender')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();