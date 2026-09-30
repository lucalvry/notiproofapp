-- ============================================
-- Fix Template Preview JSON Structure
-- ============================================
-- Problem: Mustache templates use dot notation ({{template.icon}})
-- but preview_json has flat keys ({"template.icon": "🎉"})
-- Solution: Convert to nested structure ({"template": {"icon": "🎉"}})

-- Update announcement templates
UPDATE public.templates
SET preview_json = jsonb_build_object(
  'template', jsonb_build_object(
    'icon', preview_json->>'template.icon',
    'title', preview_json->>'template.title',
    'message', preview_json->>'template.message',
    'cta_text', preview_json->>'template.cta_text',
    'cta_url', preview_json->>'template.cta_url',
    'image_url', preview_json->>'template.image_url'
  )
)
WHERE provider = 'announcements'
  AND preview_json ? 'template.icon';

-- Update shopify templates
UPDATE public.templates
SET preview_json = jsonb_build_object(
  'template', jsonb_build_object(
    'customer_name', preview_json->>'template.customer_name',
    'product_name', preview_json->>'template.product_name',
    'price', preview_json->>'template.price',
    'currency', preview_json->>'template.currency',
    'time_ago', preview_json->>'template.time_ago',
    'product_image', preview_json->>'template.product_image',
    'location', preview_json->>'template.location'
  )
)
WHERE provider = 'shopify'
  AND preview_json ? 'template.customer_name';

-- Update testimonial templates
UPDATE public.templates
SET preview_json = jsonb_build_object(
  'template', jsonb_build_object(
    'author_name', preview_json->>'template.author_name',
    'rating', preview_json->>'template.rating',
    'message', preview_json->>'template.message',
    'author_title', preview_json->>'template.author_title',
    'author_company', preview_json->>'template.author_company',
    'avatar_url', preview_json->>'template.avatar_url',
    'time_ago', preview_json->>'template.time_ago'
  )
)
WHERE provider = 'testimonials'
  AND preview_json ? 'template.author_name';

-- Update instant_capture templates
UPDATE public.templates
SET preview_json = jsonb_build_object(
  'template', jsonb_build_object(
    'message', preview_json->>'template.message',
    'time_ago', preview_json->>'template.time_ago'
  )
)
WHERE provider = 'instant_capture'
  AND preview_json ? 'template.message';

-- Update live_visitors templates
UPDATE public.templates
SET preview_json = jsonb_build_object(
  'template', jsonb_build_object(
    'visitor_count', preview_json->>'template.visitor_count',
    'location', preview_json->>'template.location'
  )
)
WHERE provider = 'live_visitors'
  AND preview_json ? 'template.visitor_count';