INSERT INTO public.app_secrets (name, value)
VALUES ('EF_GENERATE_CONTENT_URL', 'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/generate-content-pieces')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();