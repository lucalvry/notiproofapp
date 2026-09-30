-- Seed templates table with provider-specific templates
-- Shopify Templates
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('shopify', 'recent_purchase_compact', 'Recent Purchase - Compact', 'Compact notification for recent purchases', 'compact', 'ecommerce', 
  '["template.customer_name", "template.product_name"]'::jsonb,
  '<div class="noti-compact"><span class="noti-icon">🛍️</span><div class="noti-content"><strong>{{template.customer_name}}</strong> just purchased <strong>{{template.product_name}}</strong></div></div>',
  '{"template.customer_name": "Sarah J.", "template.product_name": "Premium Sneakers"}'::jsonb,
  true) ON CONFLICT (provider, template_key, style_variant) DO NOTHING;

-- Stripe Templates
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('stripe', 'payment_success_compact', 'Payment Success - Compact', 'Compact payment notification', 'compact', 'payment',
  '["template.customer_name", "template.amount"]'::jsonb,
  '<div class="noti-compact"><span class="noti-icon">💳</span><div class="noti-content"><strong>{{template.customer_name}}</strong> just completed a payment of <strong>{{template.amount}}</strong></div></div>',
  '{"template.customer_name": "John D.", "template.amount": "$49.99"}'::jsonb,
  true) ON CONFLICT (provider, template_key, style_variant) DO NOTHING;

-- Testimonial Templates
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('testimonials', 'testimonial_card', 'Testimonial - Card', 'Card-style testimonial with avatar', 'card', 'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-card testimonial"><div class="noti-header"><img src="{{template.author_avatar}}" class="noti-avatar"><div><strong>{{template.author_name}}</strong><div class="noti-rating">{{template.rating_stars}}</div></div></div><div class="noti-body"><p>{{template.message}}</p></div></div>',
  '{"template.author_name": "Emma Wilson", "template.author_avatar": "https://i.pravatar.cc/150?img=1", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "This product exceeded my expectations!"}'::jsonb,
  true) ON CONFLICT (provider, template_key, style_variant) DO NOTHING;