-- ================================================
-- TESTIMONIAL SYSTEM: Database Setup (Fixed)
-- ================================================

-- 1. Add testimonials to integrations_config (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.integrations_config 
    WHERE integration_type = 'testimonials'
  ) THEN
    INSERT INTO public.integrations_config (
      integration_type,
      is_active,
      connector_type,
      config,
      setup_instructions,
      requires_oauth,
      requires_admin_credentials
    ) VALUES (
      'testimonials',
      true,
      'native',
      '{
        "collection_methods": ["form", "import", "api"],
        "auto_approve": false,
        "require_moderation": true,
        "min_rating": 1,
        "max_rating": 5,
        "allow_video": true,
        "allow_photo": true,
        "default_fields": ["name", "email", "company", "position", "rating", "message"]
      }'::jsonb,
      'Collect and display customer testimonials. Create collection forms, import testimonials, or use the API to add them programmatically.',
      false,
      false
    );
  END IF;
END $$;

-- 2. Seed testimonial templates in marketplace_templates
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get first user ID or use a placeholder
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  IF first_user_id IS NULL THEN
    first_user_id := gen_random_uuid();
  END IF;

  -- Template 1: Classic Card with Avatar
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Classic Testimonial Card') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Classic Testimonial Card',
      'Traditional testimonial with avatar, name, and quote',
      'testimonial',
      '{"required_fields": ["user_name", "message", "rating"], "optional_fields": ["avatar_url", "company", "position"], "layout": "card", "show_rating": true, "show_avatar": true, "show_company": true}'::jsonb,
      '{"position": "bottom-right", "animation": "slide-up", "theme": "light", "card_style": "elevated", "avatar_size": "md", "text_align": "left", "star_color": "#FFD700", "padding": "md"}'::jsonb,
      '{"show_duration_ms": 6000, "interval_ms": 10000, "max_per_page": 5, "max_per_session": 15}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['ecommerce', 'saas', 'services', 'education']::text[],
      true, true, 90, ARRAY['testimonial', 'social-proof', 'reviews', 'classic']::text[], first_user_id
    );
  END IF;

  -- Template 2: Minimal Quote Style
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Minimal Quote') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Minimal Quote',
      'Clean quote-style testimonial with subtle branding',
      'testimonial',
      '{"required_fields": ["message", "user_name"], "optional_fields": ["company", "avatar_url"], "layout": "quote", "show_rating": true, "show_quotation_marks": true, "compact_mode": true}'::jsonb,
      '{"position": "bottom-left", "animation": "fade-in", "theme": "minimal", "quote_style": "serif", "text_align": "center", "show_avatar": false, "show_company_below": true, "padding": "sm"}'::jsonb,
      '{"show_duration_ms": 5000, "interval_ms": 8000, "max_per_page": 3, "max_per_session": 12}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['saas', 'agency', 'consulting']::text[],
      true, false, 80, ARRAY['testimonial', 'minimal', 'quote']::text[], first_user_id
    );
  END IF;

  -- Template 3: Star Rating Highlight
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Star Rating Highlight') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Star Rating Highlight',
      'Compact notification highlighting star ratings',
      'testimonial',
      '{"required_fields": ["user_name", "rating"], "optional_fields": ["message", "avatar_url"], "layout": "compact", "show_rating": true, "rating_prominent": true, "truncate_message": true, "max_message_length": 80}'::jsonb,
      '{"position": "top-right", "animation": "bounce", "theme": "light", "size": "compact", "star_color": "#FFD700", "star_size": "lg", "show_verified_badge": true, "padding": "xs"}'::jsonb,
      '{"show_duration_ms": 4000, "interval_ms": 7000, "max_per_page": 8, "max_per_session": 20}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['ecommerce', 'services']::text[],
      true, true, 85, ARRAY['testimonial', 'rating', 'compact', 'stars']::text[], first_user_id
    );
  END IF;

  -- Template 4: Video Testimonial
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Video Testimonial') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Video Testimonial',
      'Show video testimonials with thumbnail and play button',
      'testimonial',
      '{"required_fields": ["user_name", "video_url"], "optional_fields": ["message", "avatar_url", "company", "thumbnail_url"], "layout": "video", "show_rating": true, "show_play_button": true, "video_autoplay": false}'::jsonb,
      '{"position": "bottom-right", "animation": "slide-up", "theme": "dark", "card_style": "video", "thumbnail_overlay": true, "show_duration": true, "padding": "md"}'::jsonb,
      '{"show_duration_ms": 8000, "interval_ms": 12000, "max_per_page": 3, "max_per_session": 10}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['saas', 'education', 'agency']::text[],
      true, true, 75, ARRAY['testimonial', 'video', 'multimedia']::text[], first_user_id
    );
  END IF;

  -- Template 5: Floating Badge
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Floating Review Badge') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Floating Review Badge',
      'Floating circular badge with rating and count',
      'testimonial',
      '{"required_fields": ["rating"], "optional_fields": ["review_count"], "layout": "badge", "show_rating": true, "show_count": true, "aggregate_display": true}'::jsonb,
      '{"position": "bottom-left", "animation": "float", "theme": "badge", "shape": "circle", "star_color": "#FFD700", "background_color": "#ffffff", "border": true, "shadow": "lg", "size": "md"}'::jsonb,
      '{"show_duration_ms": 999999, "interval_ms": 999999, "max_per_page": 1, "max_per_session": 1, "persistent": true}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['ecommerce', 'services', 'saas']::text[],
      true, false, 70, ARRAY['testimonial', 'badge', 'floating', 'aggregate']::text[], first_user_id
    );
  END IF;

  -- Template 6: Full Width Banner
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Testimonial Banner') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Testimonial Banner',
      'Full-width testimonial banner for high impact',
      'testimonial',
      '{"required_fields": ["message", "user_name", "avatar_url"], "optional_fields": ["company", "position", "rating"], "layout": "banner", "show_rating": true, "show_avatar": true, "full_width": true}'::jsonb,
      '{"position": "top-center", "animation": "slide-down", "theme": "banner", "text_align": "center", "avatar_size": "lg", "background_gradient": true, "padding": "lg"}'::jsonb,
      '{"show_duration_ms": 7000, "interval_ms": 15000, "max_per_page": 2, "max_per_session": 8}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['saas', 'agency', 'education']::text[],
      true, false, 65, ARRAY['testimonial', 'banner', 'full-width']::text[], first_user_id
    );
  END IF;
END $$;