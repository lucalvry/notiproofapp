-- Execute seed-templates-v2.sql to populate templates table

-- ============================================
-- SEED TEMPLATES FOR UNIFIED SYSTEM V2
-- Integration-specific templates
-- ============================================

-- ============================================
-- SHOPIFY TEMPLATES
-- ============================================

INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('shopify', 'recent_purchase_v1', 'Recent Purchase - Compact', 'Compact notification for recent Shopify purchases', 'compact', 'ecommerce', 
'["template.customer_name", "template.product_name", "template.price", "template.currency", "template.time_ago"]'::jsonb,
'<div class="notification-compact">
  <div class="notification-icon">🛍️</div>
  <div class="notification-content">
    <p><strong>{{template.customer_name}}</strong> {{#template.customer_location}}from {{template.customer_location}}{{/template.customer_location}} just purchased</p>
    <p class="product-name">{{template.product_name}}</p>
    <p class="price">{{template.currency}} {{template.price}}</p>
  </div>
  <div class="notification-time">{{template.time_ago}}</div>
</div>',
'{"template.customer_name": "Sarah J.", "template.customer_location": "New York", "template.product_name": "Premium Headphones", "template.price": 199.99, "template.currency": "USD", "template.time_ago": "2 min ago"}'::jsonb,
true),

('shopify', 'recent_purchase_v2', 'Recent Purchase - Card', 'Full card with product image for Shopify purchases', 'card', 'ecommerce',
'["template.customer_name", "template.product_name", "template.product_image", "template.price", "template.currency"]'::jsonb,
'<div class="notification-card">
  {{#template.product_image}}
  <img src="{{template.product_image}}" alt="{{template.product_name}}" class="product-image" />
  {{/template.product_image}}
  <div class="card-content">
    <h4>Recent Purchase</h4>
    <p><strong>{{template.customer_name}}</strong> just bought</p>
    <p class="product-name">{{template.product_name}}</p>
    <p class="price">{{template.currency}} {{template.price}}</p>
    {{#template.time_ago}}<p class="time">{{template.time_ago}}</p>{{/template.time_ago}}
  </div>
</div>',
'{"template.customer_name": "Michael Chen", "template.product_name": "Organic T-Shirt", "template.product_image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", "template.price": 29.99, "template.currency": "CAD", "template.time_ago": "5 min ago"}'::jsonb,
true);

-- ============================================
-- TESTIMONIAL TEMPLATES
-- ============================================

INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('testimonials', 'testimonial_compact_v1', 'Testimonial - Compact', 'Compact testimonial with rating', 'compact', 'testimonial',
'["template.author_name", "template.rating", "template.message"]'::jsonb,
'<div class="testimonial-compact">
  <div class="testimonial-header">
    {{#template.author_avatar}}
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar" />
    {{/template.author_avatar}}
    <div>
      <p class="author-name">{{template.author_name}}</p>
      <div class="rating">{{template.rating_stars}}</div>
    </div>
  </div>
  <p class="testimonial-message">{{template.message}}</p>
  {{#template.verified}}<span class="verified-badge">✓ Verified Purchase</span>{{/template.verified}}
</div>',
'{"template.author_name": "Emma Wilson", "template.author_avatar": "https://i.pravatar.cc/150?img=1", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Absolutely love this product! Quality exceeded my expectations.", "template.verified": true}'::jsonb,
true),

('testimonials', 'testimonial_card_v1', 'Testimonial - Card', 'Full testimonial card with image support', 'card', 'testimonial',
'["template.author_name", "template.rating", "template.message"]'::jsonb,
'<div class="testimonial-card">
  <div class="testimonial-header">
    {{#template.author_avatar}}
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar-large" />
    {{/template.author_avatar}}
    <div>
      <p class="author-name">{{template.author_name}}</p>
      <div class="rating">{{template.rating_stars}}</div>
      {{#template.time_ago}}<p class="time">{{template.time_ago}}</p>{{/template.time_ago}}
    </div>
  </div>
  <p class="testimonial-message">{{template.message}}</p>
  {{#template.image_url}}
  <img src="{{template.image_url}}" alt="Testimonial" class="testimonial-image" />
  {{/template.image_url}}
  {{#template.verified}}<span class="verified-badge">✓ Verified Purchase</span>{{/template.verified}}
</div>',
'{"template.author_name": "David Martinez", "template.author_avatar": "https://i.pravatar.cc/150?img=2", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Best purchase I made this year. Customer service was excellent!", "template.image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", "template.time_ago": "3 hours ago", "template.verified": true}'::jsonb,
true),

('testimonials', 'testimonial_video_v1', 'Testimonial - Video', 'Video testimonial with play button', 'video', 'testimonial',
'["template.author_name", "template.rating", "template.message", "template.video_url"]'::jsonb,
'<div class="testimonial-video">
  <div class="video-container">
    <a href="{{template.video_url}}" target="_blank" class="video-play">
      <div class="play-button">▶</div>
    </a>
  </div>
  <div class="testimonial-content">
    <div class="testimonial-header">
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar" />
      {{/template.author_avatar}}
      <div>
        <p class="author-name">{{template.author_name}}</p>
        <div class="rating">{{template.rating_stars}}</div>
      </div>
    </div>
    <p class="testimonial-message">{{template.message}}</p>
  </div>
</div>',
'{"template.author_name": "Lisa Anderson", "template.author_avatar": "https://i.pravatar.cc/150?img=3", "template.rating": 4, "template.rating_stars": "★★★★☆", "template.message": "Great product overall. Would recommend!", "template.video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "template.time_ago": "1 day ago"}'::jsonb,
true);

-- ============================================
-- ANNOUNCEMENT TEMPLATES
-- ============================================

INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('announcements', 'announcement_banner_v1', 'Announcement - Banner', 'Top banner announcement with CTA', 'toast', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div class="announcement-banner">
  <div class="announcement-icon">{{template.icon}}</div>
  <div class="announcement-content">
    <h4>{{template.title}}</h4>
    <p>{{template.message}}</p>
  </div>
  {{#template.cta_url}}
  <a href="{{template.cta_url}}" class="announcement-cta">{{template.cta_text}}</a>
  {{/template.cta_url}}
</div>',
'{"template.icon": "🎉", "template.title": "New Feature Released", "template.message": "Check out our brand new dashboard!", "template.cta_text": "Explore Now", "template.cta_url": "/dashboard"}'::jsonb,
true),

('announcements', 'announcement_hero_v1', 'Announcement - Hero', 'Large hero announcement with image', 'hero', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div class="announcement-hero">
  {{#template.image_url}}
  <img src="{{template.image_url}}" alt="{{template.title}}" class="hero-image" />
  {{/template.image_url}}
  <div class="hero-content">
    <div class="hero-icon">{{template.icon}}</div>
    <h2>{{template.title}}</h2>
    <p>{{template.message}}</p>
    {{#template.cta_url}}
    <a href="{{template.cta_url}}" class="hero-cta">{{template.cta_text}}</a>
    {{/template.cta_url}}
  </div>
</div>',
'{"template.icon": "⚡", "template.title": "Limited Time Offer", "template.message": "Get 30% off on all premium plans. Offer ends soon!", "template.cta_text": "Upgrade Now", "template.cta_url": "/pricing"}'::jsonb,
true);

-- ============================================
-- INSTANT CAPTURE TEMPLATES
-- ============================================

INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('instant_capture', 'instant_capture_v1', 'Instant Capture - Compact', 'Real-time capture notification', 'compact', 'native',
'["template.message", "template.time_ago"]'::jsonb,
'<div class="notification-compact">
  <div class="notification-icon">⚡</div>
  <div class="notification-content">
    <p>{{template.message}}</p>
  </div>
  <div class="notification-time">{{template.time_ago}}</div>
</div>',
'{"template.message": "Someone just signed up!", "template.time_ago": "Just now"}'::jsonb,
true);

-- ============================================
-- LIVE VISITORS TEMPLATES
-- ============================================

INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('live_visitors', 'live_visitors_v1', 'Live Visitors - Compact', 'Real-time visitor count', 'compact', 'native',
'["template.visitor_count", "template.location"]'::jsonb,
'<div class="notification-compact">
  <div class="notification-icon">👥</div>
  <div class="notification-content">
    <p><strong>{{template.visitor_count}}</strong> people {{#template.location}}from {{template.location}}{{/template.location}} are viewing this page</p>
  </div>
</div>',
'{"template.visitor_count": 12, "template.location": "United States"}'::jsonb,
true);

-- ============================================
-- VERIFY TEMPLATES
-- ============================================
SELECT 
  provider,
  COUNT(*) as template_count,
  array_agg(DISTINCT style_variant) as variants
FROM public.templates
WHERE is_active = true
GROUP BY provider
ORDER BY provider;