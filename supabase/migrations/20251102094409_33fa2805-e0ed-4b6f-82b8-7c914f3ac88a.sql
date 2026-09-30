-- Seed missing marketplace templates for campaign types
-- This migration adds templates for NGO, E-commerce, SaaS, and Social campaign types

-- Create a function to insert templates with a system user context
CREATE OR REPLACE FUNCTION seed_marketplace_templates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  system_user_id uuid;
BEGIN
  -- Get the first admin user or create a system placeholder
  SELECT id INTO system_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  IF system_user_id IS NULL THEN
    -- If no admin exists, use a placeholder UUID
    system_user_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- ========== PRIORITY 1: NGO TEMPLATES (3) ==========
  
  -- 1. Donation Notification
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Donation Alert',
    'Show real-time donation notifications to build trust and encourage more giving',
    'social',
    jsonb_build_object(
      'messageTemplate', '{{donor_name}} from {{location}} just donated {{amount}} to {{cause}}',
      'variables', jsonb_build_object(
        'donor_name', 'Someone',
        'location', '',
        'amount', '$50',
        'cause', 'our cause'
      ),
      'exampleMessage', 'Sarah from Seattle just donated $50 to clean water'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(24, 95%, 53%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(24, 95%, 43%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'slide-in',
      'position', 'bottom-left',
      'icon', '💝',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['donation-notification']::text[],
    ARRAY['ngo']::text[],
    system_user_id,
    true,
    true,
    90
  ) ON CONFLICT DO NOTHING;

  -- 2. Impact Milestone
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Impact Milestone Celebration',
    'Celebrate and showcase your organization''s impact milestones to donors',
    'social',
    jsonb_build_object(
      'messageTemplate', '{{emoji}} {{milestone_text}}',
      'variables', jsonb_build_object(
        'emoji', '🎉',
        'milestone_text', 'We''ve provided 10,000 meals this month!'
      ),
      'exampleMessage', '🎉 We''ve provided 10,000 meals this month!'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(142, 71%, 45%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(142, 71%, 35%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'fade-in',
      'position', 'top-center',
      'icon', '🎉',
      'displayDuration', 7000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 1000,
      'displayFrequency', 'once_per_day',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['impact-milestone']::text[],
    ARRAY['ngo']::text[],
    system_user_id,
    true,
    true,
    85
  ) ON CONFLICT DO NOTHING;

  -- 3. Volunteer Signup
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Volunteer Sign-up Notification',
    'Show volunteer engagement to motivate others to join your cause',
    'social',
    jsonb_build_object(
      'messageTemplate', '{{volunteer_name}} just signed up to {{activity}}',
      'variables', jsonb_build_object(
        'volunteer_name', 'Someone',
        'activity', 'volunteer at our food drive'
      ),
      'exampleMessage', 'James just signed up to volunteer at our food drive'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(262, 83%, 58%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(262, 83%, 48%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'slide-in',
      'position', 'bottom-right',
      'icon', '🙋',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['volunteer-signup']::text[],
    ARRAY['ngo']::text[],
    system_user_id,
    true,
    true,
    85
  ) ON CONFLICT DO NOTHING;

  -- ========== PRIORITY 2: E-COMMERCE TEMPLATES (3) ==========

  -- 4. Recently Viewed
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Recently Viewed Notification',
    'Show who recently viewed the product to create urgency and social proof',
    'ecommerce',
    jsonb_build_object(
      'messageTemplate', '{{user_name}} from {{location}} viewed this {{timeframe}}',
      'variables', jsonb_build_object(
        'user_name', 'Someone',
        'location', 'New York',
        'timeframe', '5 minutes ago'
      ),
      'exampleMessage', 'Emma from NYC viewed this 5 minutes ago'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(221, 83%, 53%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(221, 83%, 43%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'fade-in',
      'position', 'bottom-left',
      'icon', '👀',
      'displayDuration', 4000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 3000,
      'displayFrequency', 'multiple_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['recently-viewed']::text[],
    ARRAY['ecommerce', 'retail']::text[],
    system_user_id,
    true,
    false,
    70
  ) ON CONFLICT DO NOTHING;

  -- 5. Wishlist Additions
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Wishlist Activity Alert',
    'Display how many people added the item to their wishlist',
    'ecommerce',
    jsonb_build_object(
      'messageTemplate', 'Added to {{count}} wishlists {{timeframe}}',
      'variables', jsonb_build_object(
        'count', '47',
        'timeframe', 'today'
      ),
      'exampleMessage', 'Added to 47 wishlists today'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(330, 70%, 50%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(330, 70%, 40%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'slide-in',
      'position', 'bottom-right',
      'icon', '❤️',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['wishlist-additions']::text[],
    ARRAY['ecommerce', 'retail']::text[],
    system_user_id,
    true,
    false,
    75
  ) ON CONFLICT DO NOTHING;

  -- 6. Cart Additions (Real-time)
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Cart Activity Tracker',
    'Show real-time cart additions to create urgency and FOMO',
    'ecommerce',
    jsonb_build_object(
      'messageTemplate', '{{count}} people added {{product_name}} to cart in the last {{timeframe}}',
      'variables', jsonb_build_object(
        'count', '3',
        'product_name', 'this',
        'timeframe', 'hour'
      ),
      'exampleMessage', '3 people added this to cart in the last hour'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(142, 71%, 45%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(142, 71%, 35%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'slide-in',
      'position', 'top-right',
      'icon', '🛒',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2500,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['cart-additions', 'cart-activity']::text[],
    ARRAY['ecommerce', 'retail']::text[],
    system_user_id,
    true,
    false,
    80
  ) ON CONFLICT DO NOTHING;

  -- ========== PRIORITY 3: SAAS TEMPLATES (2) ==========

  -- 7. Upgrade Events
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Plan Upgrade Notification',
    'Show users upgrading to premium plans to encourage conversions',
    'saas',
    jsonb_build_object(
      'messageTemplate', '{{user_name}} upgraded to {{plan_name}}',
      'variables', jsonb_build_object(
        'user_name', 'Someone',
        'plan_name', 'Pro Plan'
      ),
      'exampleMessage', 'Sarah upgraded to Pro Plan'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(262, 83%, 58%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(262, 83%, 48%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'slide-in',
      'position', 'bottom-right',
      'icon', '⬆️',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['upgrade-events']::text[],
    ARRAY['saas']::text[],
    system_user_id,
    true,
    false,
    75
  ) ON CONFLICT DO NOTHING;

  -- 8. Trial Starts
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Trial Start Notification',
    'Display when users start free trials to build social proof',
    'saas',
    jsonb_build_object(
      'messageTemplate', '{{user_name}} started a {{plan_type}} {{timeframe}}',
      'variables', jsonb_build_object(
        'user_name', 'Someone',
        'plan_type', 'free trial',
        'timeframe', '3 minutes ago'
      ),
      'exampleMessage', 'Alex started a free trial 3 minutes ago'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(221, 83%, 53%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(221, 83%, 43%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'fade-in',
      'position', 'bottom-left',
      'icon', '🚀',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['trial-starts']::text[],
    ARRAY['saas']::text[],
    system_user_id,
    true,
    false,
    70
  ) ON CONFLICT DO NOTHING;

  -- ========== PRIORITY 4: CONTENT/SOCIAL TEMPLATES (3) ==========

  -- 9. Content Downloads
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Resource Download Alert',
    'Show when users download your content resources',
    'content',
    jsonb_build_object(
      'messageTemplate', '{{user_name}} downloaded {{resource_name}}',
      'variables', jsonb_build_object(
        'user_name', 'Someone',
        'resource_name', 'the free guide'
      ),
      'exampleMessage', 'Michael downloaded the free guide'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(24, 95%, 53%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(24, 95%, 43%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'slide-in',
      'position', 'bottom-right',
      'icon', '📥',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['content-downloads']::text[],
    ARRAY['blog', 'media', 'education', 'marketing_agency']::text[],
    system_user_id,
    true,
    false,
    70
  ) ON CONFLICT DO NOTHING;

  -- 10. Social Shares
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'Social Share Counter',
    'Display social sharing activity to encourage more shares',
    'social',
    jsonb_build_object(
      'messageTemplate', '{{content_type}} shared on {{platform}} {{count}} times {{timeframe}}',
      'variables', jsonb_build_object(
        'content_type', 'Article',
        'platform', 'Twitter',
        'count', '24',
        'timeframe', 'today'
      ),
      'exampleMessage', 'Article shared on Twitter 24 times today'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(221, 83%, 53%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(221, 83%, 43%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'fade-in',
      'position', 'top-right',
      'icon', '🔄',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['social-shares']::text[],
    ARRAY['blog', 'media', 'saas']::text[],
    system_user_id,
    true,
    false,
    65
  ) ON CONFLICT DO NOTHING;

  -- 11. Community Joins
  INSERT INTO marketplace_templates (
    name, description, category, template_config, style_config, display_rules,
    supported_campaign_types, business_types, created_by, is_public, is_featured, priority
  ) VALUES (
    'New Community Member Alert',
    'Welcome new community members and show community growth',
    'social',
    jsonb_build_object(
      'messageTemplate', '{{user_name}} joined {{community_name}}',
      'variables', jsonb_build_object(
        'user_name', 'Someone',
        'community_name', 'the community'
      ),
      'exampleMessage', 'Alex joined the community'
    ),
    jsonb_build_object(
      'backgroundColor', 'hsl(142, 71%, 45%)',
      'textColor', 'hsl(0, 0%, 100%)',
      'borderColor', 'hsl(142, 71%, 35%)',
      'fontFamily', 'Inter, system-ui, sans-serif',
      'borderRadius', '8px',
      'animation', 'slide-in',
      'position', 'bottom-left',
      'icon', '👋',
      'displayDuration', 5000,
      'showCloseButton', true,
      'enableSound', false
    ),
    jsonb_build_object(
      'triggerEvent', 'page_load',
      'displayDelay', 2000,
      'displayFrequency', 'once_per_session',
      'urlRules', jsonb_build_object('enabled', false)
    ),
    ARRAY['community-joins']::text[],
    ARRAY['saas', 'blog', 'education']::text[],
    system_user_id,
    true,
    false,
    70
  ) ON CONFLICT DO NOTHING;

END;
$$;

-- Execute the seeding function
SELECT seed_marketplace_templates();

-- Drop the function after use
DROP FUNCTION seed_marketplace_templates();