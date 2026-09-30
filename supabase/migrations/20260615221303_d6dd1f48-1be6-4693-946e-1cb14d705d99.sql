-- Register the EF URL for the dispatch trigger (idempotent).
INSERT INTO public.app_secrets (name, value)
VALUES (
  'EF_ENRICH_PRODUCT_IMAGES_URL',
  'https://ykpvxwwhhdzihjphlohh.supabase.co/functions/v1/enrich-proof-product-images'
)
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- Dispatch trigger: fires after INSERT or UPDATE of product_image_url
-- when image_fetch_status is pending. Posts to EF-09 via pg_net.
-- Modelled on tg_call_campaign_evaluator: swallows errors so writes
-- never fail because of the EF call.
CREATE OR REPLACE FUNCTION public.tg_call_enrich_product_images()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text;
  internal_secret text;
BEGIN
  IF NEW.product_image_url IS NULL OR NEW.image_fetch_status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only dispatch when the URL changed or status moved back to pending
  IF TG_OP = 'UPDATE'
     AND OLD.product_image_url IS NOT DISTINCT FROM NEW.product_image_url
     AND OLD.image_fetch_status = NEW.image_fetch_status THEN
    RETURN NEW;
  END IF;

  SELECT value INTO fn_url FROM public.app_secrets WHERE name = 'EF_ENRICH_PRODUCT_IMAGES_URL';
  SELECT value INTO internal_secret FROM public.app_secrets WHERE name = 'INTERNAL_TRIGGER_SECRET';

  IF fn_url IS NULL OR internal_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', internal_secret
    ),
    body := jsonb_build_object('proof_product_item_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ppi_enrich_dispatch
  AFTER INSERT OR UPDATE OF product_image_url, image_fetch_status
  ON public.proof_product_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_call_enrich_product_images();

-- Daily retry: reset failed rows under retry budget back to pending,
-- which the trigger above will then redispatch.
CREATE OR REPLACE FUNCTION public.retry_failed_product_image_enrichment()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.proof_product_items
     SET image_fetch_status = 'pending'
   WHERE image_fetch_status = 'failed'
     AND retry_count < 3
     AND product_image_url IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Schedule the daily retry (3am UTC). Safe to re-run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('retry_failed_product_image_enrichment')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'retry_failed_product_image_enrichment'
      );
    PERFORM cron.schedule(
      'retry_failed_product_image_enrichment',
      '0 3 * * *',
      $cron$ SELECT public.retry_failed_product_image_enrichment(); $cron$
    );
  END IF;
END $$;
