-- ============================================
-- WORKSTREAM 1: UNIFIED SYSTEM CORE SCHEMA
-- Phase 1.1: New Tables & Foreign Keys
-- ============================================

-- ============================================
-- 1. INTEGRATIONS TABLE (replaces integration_connectors with canonical structure)
-- ============================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'shopify', 'stripe', 'woocommerce', 'webhook', 'manual', 'testimonials', 'announcements', 'live_visitors', 'instant_capture'
  name TEXT NOT NULL,
  credentials JSONB DEFAULT '{}'::jsonb, -- oauth tokens, webhook urls, api keys
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status JSONB DEFAULT '{"success": true, "events_synced": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_integrations_website_id ON public.integrations(website_id);
CREATE INDEX idx_integrations_provider ON public.integrations(provider);
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);

-- ============================================
-- 2. TEMPLATES TABLE (integration-specific templates)
-- ============================================
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'shopify', 'woocommerce', 'testimonials', 'announcements', etc.
  template_key TEXT NOT NULL, -- e.g., 'recent_purchase_v1', 'testimonial_card_v1'
  name TEXT NOT NULL,
  description TEXT,
  style_variant TEXT NOT NULL, -- 'compact', 'card', 'toast', 'hero', 'carousel', 'video'
  category TEXT DEFAULT 'general', -- 'ecommerce', 'testimonial', 'social_proof', 'announcement'
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['product_name', 'price', 'customer_name']
  html_template TEXT NOT NULL, -- mustache/handlebars template
  preview_json JSONB DEFAULT '{}'::jsonb, -- sample data for preview
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider, template_key, style_variant)
);

CREATE INDEX idx_templates_provider ON public.templates(provider);
CREATE INDEX idx_templates_category ON public.templates(category);

-- ============================================
-- 3. TESTIMONIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'form', -- 'form', 'import', 'api', 'qr', 'link'
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_avatar_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  metadata JSONB DEFAULT '{}'::jsonb, -- product_id, order_id, verification_data, etc.
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_testimonials_website_id ON public.testimonials(website_id);
CREATE INDEX idx_testimonials_status ON public.testimonials(status);
CREATE INDEX idx_testimonials_rating ON public.testimonials(rating);
CREATE INDEX idx_testimonials_created_at ON public.testimonials(created_at DESC);

-- ============================================
-- 4. TESTIMONIAL COLLECTION FORMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.testimonial_collection_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  form_config JSONB NOT NULL DEFAULT '{
    "fields": ["name", "email", "rating", "message"],
    "require_email": true,
    "allow_images": true,
    "allow_video": true,
    "auto_approve": false
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(website_id, slug)
);

CREATE INDEX idx_testimonial_forms_website_id ON public.testimonial_collection_forms(website_id);

-- ============================================
-- 5. CAMPAIGN PLAYLISTS TABLE (orchestration)
-- ============================================
CREATE TABLE IF NOT EXISTS public.campaign_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_order UUID[] DEFAULT '{}'::UUID[], -- ordered array of campaign_ids
  rules JSONB DEFAULT '{
    "sequence_mode": "priority",
    "cooldown_seconds": 300,
    "max_per_session": 10
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_campaign_playlists_website_id ON public.campaign_playlists(website_id);

-- ============================================
-- 6. UPDATE CAMPAIGNS TABLE
-- ============================================
-- Add new columns for unified system
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_mapping JSONB DEFAULT '{}'::jsonb, -- {templateVar: adapterField}
  ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'notification',
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS frequency_cap JSONB DEFAULT '{"per_user": 1, "per_session": 1, "cooldown_seconds": 600}'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}'::jsonb;

-- Update data_source to be JSONB array for multi-integration support
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS data_sources_v2 JSONB DEFAULT '[]'::jsonb;

-- Add foreign key constraint to website_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_website_id_fkey' 
    AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE public.campaigns 
      ADD CONSTRAINT campaigns_website_id_fkey 
      FOREIGN KEY (website_id) 
      REFERENCES public.websites(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON public.campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_type ON public.campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_priority ON public.campaigns(priority);

-- ============================================
-- 7. UPDATE EVENTS TABLE
-- ============================================
-- Ensure website_id has proper FK constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_website_id_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events 
      ADD CONSTRAINT events_website_id_fkey 
      FOREIGN KEY (website_id) 
      REFERENCES public.websites(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add integration_id reference
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;

-- Add canonical_event column for normalized adapter output
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS canonical_event JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_events_integration_id ON public.events(integration_id);

-- ============================================
-- 8. UPDATE WIDGETS TABLE
-- ============================================
-- Ensure website_id is NOT NULL and has FK constraint
ALTER TABLE public.widgets 
  ALTER COLUMN website_id SET NOT NULL;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'widgets_website_id_fkey' 
    AND table_name = 'widgets'
  ) THEN
    ALTER TABLE public.widgets 
      ADD CONSTRAINT widgets_website_id_fkey 
      FOREIGN KEY (website_id) 
      REFERENCES public.websites(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 9. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Integrations RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integrations for their websites"
  ON public.integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = integrations.website_id 
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create integrations for their websites"
  ON public.integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = integrations.website_id 
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update integrations for their websites"
  ON public.integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = integrations.website_id 
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete integrations for their websites"
  ON public.integrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = integrations.website_id 
      AND w.user_id = auth.uid()
    )
  );

-- Templates RLS (public read, admin write)
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.templates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Testimonials RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view testimonials for their websites"
  ON public.testimonials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = testimonials.website_id 
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create testimonials for their websites"
  ON public.testimonials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = testimonials.website_id 
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update testimonials for their websites"
  ON public.testimonials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = testimonials.website_id 
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete testimonials for their websites"
  ON public.testimonials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = testimonials.website_id 
      AND w.user_id = auth.uid()
    )
  );

-- Public can submit testimonials via forms (no auth required)
CREATE POLICY "Public can submit testimonials"
  ON public.testimonials FOR INSERT
  WITH CHECK (source IN ('form', 'link', 'qr'));

-- Testimonial Collection Forms RLS
ALTER TABLE public.testimonial_collection_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage forms for their websites"
  ON public.testimonial_collection_forms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = testimonial_collection_forms.website_id 
      AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = testimonial_collection_forms.website_id 
      AND w.user_id = auth.uid()
    )
  );

-- Campaign Playlists RLS
ALTER TABLE public.campaign_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage playlists for their websites"
  ON public.campaign_playlists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = campaign_playlists.website_id 
      AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w 
      WHERE w.id = campaign_playlists.website_id 
      AND w.user_id = auth.uid()
    )
  );

-- ============================================
-- 10. MIGRATION HELPER FUNCTIONS
-- ============================================

-- Function to migrate existing integration_connectors to integrations table
CREATE OR REPLACE FUNCTION migrate_integration_connectors_to_integrations()
RETURNS void AS $$
BEGIN
  INSERT INTO public.integrations (
    id,
    user_id,
    website_id,
    provider,
    name,
    credentials,
    is_active,
    last_sync_at,
    sync_status,
    created_at,
    updated_at
  )
  SELECT 
    ic.id,
    ic.user_id,
    ic.website_id,
    ic.integration_type::text,
    ic.name,
    ic.config,
    (ic.status = 'active'),
    ic.last_sync,
    ic.last_sync_status,
    ic.created_at,
    ic.updated_at
  FROM public.integration_connectors ic
  WHERE NOT EXISTS (
    SELECT 1 FROM public.integrations i WHERE i.id = ic.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.integrations IS 'Unified integration connections - replaces integration_connectors';
COMMENT ON TABLE public.templates IS 'Integration-specific notification templates with variants';
COMMENT ON TABLE public.testimonials IS 'User-submitted testimonials for social proof campaigns';
COMMENT ON TABLE public.testimonial_collection_forms IS 'Testimonial collection forms and configurations';
COMMENT ON TABLE public.campaign_playlists IS 'Website-level campaign orchestration and sequencing';
COMMENT ON COLUMN public.campaigns.data_sources_v2 IS 'Array of integration sources: [{integration_id, provider, adapter_config}]';
COMMENT ON COLUMN public.campaigns.template_mapping IS 'Maps template variables to adapter fields: {templateVar: adapterField}';
COMMENT ON COLUMN public.events.canonical_event IS 'Normalized event payload from adapter';
