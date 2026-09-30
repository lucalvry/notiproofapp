-- Phase 8: Add remaining testimonial templates (Testimonial Card v2 and Bubble)

DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Get first user ID or use a placeholder
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  IF first_user_id IS NULL THEN
    first_user_id := gen_random_uuid();
  END IF;

  -- Template: Testimonial Card v2 (Modern variant with gradient)
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Testimonial Card v2') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Testimonial Card v2',
      'Modern testimonial card with gradient background and animated stars',
      'testimonial',
      '{"required_fields": ["user_name", "message", "rating"], "optional_fields": ["avatar_url", "company", "position", "image_url"], "layout": "card-modern", "show_rating": true, "show_avatar": true, "show_company": true, "show_image": true}'::jsonb,
      '{"position": "bottom-right", "animation": "slide-in-right", "theme": "gradient", "card_style": "modern", "avatar_size": "lg", "text_align": "left", "star_color": "#FFD700", "gradient_colors": ["#667eea", "#764ba2"], "padding": "lg", "rounded": "xl", "shadow": "2xl"}'::jsonb,
      '{"show_duration_ms": 7000, "interval_ms": 12000, "max_per_page": 4, "max_per_session": 12}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['saas', 'tech', 'agency', 'education']::text[],
      true, true, 88, ARRAY['testimonial', 'modern', 'gradient', 'v2']::text[], first_user_id
    );
  END IF;

  -- Template: Bubble (Speech bubble design)
  IF NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE name = 'Speech Bubble') THEN
    INSERT INTO public.marketplace_templates (
      name, description, category, template_config, style_config, display_rules,
      supported_campaign_types, business_types, is_public, is_featured, priority, tags, created_by
    ) VALUES (
      'Speech Bubble',
      'Testimonial in a chat bubble style with tail pointer',
      'testimonial',
      '{"required_fields": ["message", "user_name"], "optional_fields": ["avatar_url", "rating", "time_ago"], "layout": "bubble", "show_rating": true, "show_avatar": true, "show_time": true, "compact_mode": true}'::jsonb,
      '{"position": "bottom-left", "animation": "pop-in", "theme": "bubble", "bubble_style": "chat", "show_tail": true, "avatar_position": "left", "text_align": "left", "bubble_color": "#f3f4f6", "text_color": "#1f2937", "padding": "md", "rounded": "2xl"}'::jsonb,
      '{"show_duration_ms": 5000, "interval_ms": 9000, "max_per_page": 5, "max_per_session": 15}'::jsonb,
      ARRAY['testimonial']::text[], ARRAY['ecommerce', 'services', 'blog', 'community']::text[],
      true, true, 82, ARRAY['testimonial', 'bubble', 'chat', 'casual']::text[], first_user_id
    );
  END IF;

END $$;

-- Verify templates were created
DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count 
  FROM marketplace_templates 
  WHERE category = 'testimonial';
  
  RAISE NOTICE 'Total testimonial templates: %', template_count;
  
  IF template_count < 8 THEN
    RAISE WARNING 'Expected at least 8 testimonial templates, found %', template_count;
  END IF;
END $$;