-- =========================================================================
-- Sprint 1: Product Proof Enrichment - schema (additive, zero behaviour change)
-- =========================================================================

-- 1) proof_product_items -----------------------------------------------------
CREATE TABLE public.proof_product_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_object_id uuid NOT NULL REFERENCES public.proof_objects(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT true,
  product_id_external text NOT NULL,
  variant_id_external text,
  product_name text NOT NULL,
  variant_label text,
  product_url text,
  product_image_url text,
  product_image_cached text,
  product_images_all text[] NOT NULL DEFAULT '{}',
  product_category text,
  product_price numeric(10,2),
  currency text,
  quantity integer NOT NULL DEFAULT 1,
  source_platform text NOT NULL,
  raw_product_payload jsonb,
  image_fetch_status text NOT NULL DEFAULT 'pending',
  image_fetch_error text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ppi_proof_object ON public.proof_product_items(proof_object_id);
CREATE INDEX idx_ppi_business ON public.proof_product_items(business_id);
CREATE INDEX idx_ppi_image_status ON public.proof_product_items(image_fetch_status)
  WHERE image_fetch_status IN ('pending','failed');
CREATE UNIQUE INDEX uq_ppi_primary_per_proof ON public.proof_product_items(proof_object_id)
  WHERE is_primary = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proof_product_items TO authenticated;
GRANT ALL ON public.proof_product_items TO service_role;

ALTER TABLE public.proof_product_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read product items"
  ON public.proof_product_items FOR SELECT
  USING (
    public.is_business_member(business_id)
    OR public.is_platform_admin()
    OR public.is_assigned_to_client(business_id)
  );

CREATE POLICY "editors write product items"
  ON public.proof_product_items FOR ALL
  USING (
    public.has_business_role(business_id, 'editor'::public.app_role)
    OR public.is_platform_admin()
    OR public.is_assigned_to_client(business_id)
  )
  WITH CHECK (
    public.has_business_role(business_id, 'editor'::public.app_role)
    OR public.is_platform_admin()
    OR public.is_assigned_to_client(business_id)
  );

CREATE TRIGGER trg_ppi_updated_at
  BEFORE UPDATE ON public.proof_product_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) proof_objects denormalised columns -------------------------------------
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS primary_product_name text,
  ADD COLUMN IF NOT EXISTS primary_product_image_cached text,
  ADD COLUMN IF NOT EXISTS primary_product_url text,
  ADD COLUMN IF NOT EXISTS product_item_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_product_enrichment boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_proof_has_enrichment
  ON public.proof_objects(business_id, has_product_enrichment)
  WHERE has_product_enrichment = true;

-- 3) widget_events new columns ----------------------------------------------
ALTER TABLE public.widget_events
  ADD COLUMN IF NOT EXISTS product_url_clicked text,
  ADD COLUMN IF NOT EXISTS product_id_external text;

-- 4) Denormalisation trigger -------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_proof_product_denorm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_has_enrichment boolean;
BEGIN
  -- Recompute counts and enrichment flag on the parent proof object.
  SELECT count(*)::int,
         bool_or(image_fetch_status = 'cached')
    INTO v_count, v_has_enrichment
    FROM public.proof_product_items
    WHERE proof_object_id = COALESCE(NEW.proof_object_id, OLD.proof_object_id);

  -- Pull primary item fields (if any).
  UPDATE public.proof_objects po
     SET product_item_count = v_count,
         has_product_enrichment = COALESCE(v_has_enrichment, false),
         primary_product_name = ppi.product_name,
         primary_product_image_cached = ppi.product_image_cached,
         primary_product_url = ppi.product_url,
         updated_at = now()
    FROM (
      SELECT product_name, product_image_cached, product_url
        FROM public.proof_product_items
       WHERE proof_object_id = COALESCE(NEW.proof_object_id, OLD.proof_object_id)
         AND is_primary = true
       LIMIT 1
    ) ppi
   WHERE po.id = COALESCE(NEW.proof_object_id, OLD.proof_object_id);

  -- Handle the case where there is no primary item (e.g. after delete).
  IF NOT FOUND THEN
    UPDATE public.proof_objects
       SET product_item_count = v_count,
           has_product_enrichment = COALESCE(v_has_enrichment, false),
           updated_at = now()
     WHERE id = COALESCE(NEW.proof_object_id, OLD.proof_object_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_ppi_sync_denorm
  AFTER INSERT OR UPDATE OR DELETE ON public.proof_product_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_proof_product_denorm();

-- 5) url_fetch_cache (used by EF-10 in Sprint 3) ----------------------------
CREATE TABLE public.url_fetch_cache (
  url text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.url_fetch_cache TO service_role;
ALTER TABLE public.url_fetch_cache ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.
