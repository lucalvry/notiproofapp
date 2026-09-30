-- ============================================
-- SEED TESTIMONIAL TEMPLATES - PHASE 8
-- 6 Beautiful Templates for Testimonial Display
-- ============================================

-- Clean up any existing testimonial templates first (optional)
DELETE FROM public.templates WHERE provider = 'testimonials' AND template_key IN (
  'testimonial_card_v1',
  'testimonial_card_v2',
  'testimonial_compact_v1',
  'testimonial_bubble_v1',
  'testimonial_hero_v1',
  'testimonial_video_v1'
);

-- Template 1: Testimonial Card (Classic)
INSERT INTO public.templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  required_fields,
  html_template,
  preview_json,
  is_active
) VALUES (
  'testimonials',
  'testimonial_card_v1',
  'Testimonial Card (Classic)',
  'Classic card layout with avatar, rating, and message',
  'card',
  'testimonial',
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
  true
);

-- Template 2: Testimonial Card v2 (Photo Focus)
INSERT INTO public.templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  required_fields,
  html_template,
  preview_json,
  is_active
) VALUES (
  'testimonials',
  'testimonial_card_v2',
  'Testimonial Card v2 (Photo Focus)',
  'Image-first layout with overlay text',
  'card',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="testimonial-card-v2">
  {{#template.image_url}}
  <div class="testimonial-image-container">
    <img src="{{template.image_url}}" alt="Testimonial" class="testimonial-hero-image" />
    <div class="image-overlay"></div>
  </div>
  {{/template.image_url}}
  <div class="testimonial-content">
    <div class="rating-large">{{template.rating_stars}}</div>
    <p class="testimonial-quote">"{{template.message}}"</p>
    <div class="testimonial-author">
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar-small" />
      {{/template.author_avatar}}
      <div>
        <p class="author-name-bold">{{template.author_name}}</p>
        {{#template.verified}}<span class="verified-badge-inline">✓ Verified</span>{{/template.verified}}
      </div>
    </div>
  </div>
</div>',
  '{"template.author_name": "Sarah Johnson", "template.author_avatar": "https://i.pravatar.cc/150?img=5", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "This product changed my life! Highly recommend to anyone looking for quality.", "template.image_url": "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=500", "template.verified": true}'::jsonb,
  true
);

-- Template 3: Compact (Minimal)
INSERT INTO public.templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  required_fields,
  html_template,
  preview_json,
  is_active
) VALUES (
  'testimonials',
  'testimonial_compact_v1',
  'Compact (Minimal)',
  'Minimal compact layout, perfect for high-frequency display',
  'compact',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="testimonial-compact">
  <div class="testimonial-header-compact">
    {{#template.author_avatar}}
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar" />
    {{/template.author_avatar}}
    <div class="flex-1">
      <p class="author-name-small">{{template.author_name}}</p>
      <div class="rating-small">{{template.rating_stars}}</div>
    </div>
    {{#template.verified}}<span class="verified-icon">✓</span>{{/template.verified}}
  </div>
  <p class="testimonial-message-compact">{{template.message}}</p>
</div>',
  '{"template.author_name": "Emma Wilson", "template.author_avatar": "https://i.pravatar.cc/150?img=1", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Absolutely love this product! Quality exceeded my expectations.", "template.verified": true}'::jsonb,
  true
);

-- Template 4: Bubble (Speech Bubble)
INSERT INTO public.templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  required_fields,
  html_template,
  preview_json,
  is_active
) VALUES (
  'testimonials',
  'testimonial_bubble_v1',
  'Bubble (Speech Bubble)',
  'Chat-style speech bubble design',
  'bubble',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="testimonial-bubble-container">
  <div class="testimonial-bubble">
    <div class="bubble-content">
      <div class="rating-inline">{{template.rating_stars}}</div>
      <p class="bubble-message">"{{template.message}}"</p>
      {{#template.verified}}<span class="verified-badge-bubble">✓ Verified Purchase</span>{{/template.verified}}
    </div>
    <div class="bubble-tail"></div>
  </div>
  <div class="bubble-author">
    {{#template.author_avatar}}
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar-medium" />
    {{/template.author_avatar}}
    <div>
      <p class="author-name">{{template.author_name}}</p>
      {{#template.time_ago}}<p class="time-small">{{template.time_ago}}</p>{{/template.time_ago}}
    </div>
  </div>
</div>',
  '{"template.author_name": "Michael Chen", "template.author_avatar": "https://i.pravatar.cc/150?img=3", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Great product overall. Would definitely recommend!", "template.time_ago": "2 days ago", "template.verified": true}'::jsonb,
  true
);

-- Template 5: Hero (Large Featured)
INSERT INTO public.templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  required_fields,
  html_template,
  preview_json,
  is_active
) VALUES (
  'testimonials',
  'testimonial_hero_v1',
  'Hero (Large Featured)',
  'Large hero format for featured testimonials',
  'hero',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="testimonial-hero">
  <div class="hero-background">
    {{#template.image_url}}
    <img src="{{template.image_url}}" alt="Background" class="hero-bg-image" />
    {{/template.image_url}}
  </div>
  <div class="hero-content-wrapper">
    <div class="hero-rating-large">{{template.rating_stars}}</div>
    <blockquote class="hero-quote">
      "{{template.message}}"
    </blockquote>
    <div class="hero-author-section">
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar-xl" />
      {{/template.author_avatar}}
      <div class="hero-author-info">
        <p class="author-name-large">{{template.author_name}}</p>
        {{#template.author_title}}<p class="author-title">{{template.author_title}}</p>{{/template.author_title}}
        {{#template.verified}}<span class="verified-badge-large">✓ Verified Customer</span>{{/template.verified}}
      </div>
    </div>
  </div>
</div>',
  '{"template.author_name": "Jennifer Adams", "template.author_avatar": "https://i.pravatar.cc/150?img=4", "template.author_title": "Marketing Director", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "This has been a game-changer for our business. The ROI was immediate and the support team is amazing. I cannot recommend this enough!", "template.image_url": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800", "template.verified": true}'::jsonb,
  true
);

-- Template 6: Video Carousel
INSERT INTO public.templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  required_fields,
  html_template,
  preview_json,
  is_active
) VALUES (
  'testimonials',
  'testimonial_video_v1',
  'Video Carousel',
  'Video testimonials with play button overlay',
  'video',
  'testimonial',
  '["template.author_name", "template.rating", "template.message", "template.video_url"]'::jsonb,
  '<div class="testimonial-video">
  <div class="video-wrapper">
    {{#template.video_url}}
    <div class="video-container">
      <div class="video-thumbnail">
        {{#template.image_url}}
        <img src="{{template.image_url}}" alt="Video thumbnail" class="thumbnail-image" />
        {{/template.image_url}}
        <div class="video-play-overlay">
          <div class="play-button-circle">
            <svg class="play-icon" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      <a href="{{template.video_url}}" target="_blank" class="video-link" rel="noopener noreferrer">
        Watch Video
      </a>
    </div>
    {{/template.video_url}}
  </div>
  <div class="video-testimonial-content">
    <div class="rating">{{template.rating_stars}}</div>
    <p class="video-message">{{template.message}}</p>
    <div class="video-author">
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar-medium" />
      {{/template.author_avatar}}
      <div>
        <p class="author-name">{{template.author_name}}</p>
        {{#template.verified}}<span class="verified-badge">✓ Verified</span>{{/template.verified}}
      </div>
    </div>
  </div>
</div>',
  '{"template.author_name": "Lisa Anderson", "template.author_avatar": "https://i.pravatar.cc/150?img=6", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "See my full review in the video! This product has exceeded all expectations.", "template.video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "template.image_url": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500", "template.verified": true}'::jsonb,
  true
);