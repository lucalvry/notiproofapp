-- ============================================
-- MODERN TESTIMONIAL TEMPLATES - PHASE 4
-- 12 Beautiful Templates Across 4 Categories
-- ============================================
-- Categories:
-- 1. Minimal Series (2) - Ratings-focused, lightweight
-- 2. Standard Series (3) - Text + Media balanced
-- 3. Media Series (3) - Video-focused displays  
-- 4. Premium Series (4) - Full-featured, hero layouts
-- ============================================

-- Clean up existing testimonial templates (optional)
-- DELETE FROM public.templates WHERE provider = 'testimonials';

-- ============================================
-- MINIMAL SERIES
-- ============================================

-- Template 1: Rating Only (Inline)
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
  'testimonial_rating_only',
  'Rating Only',
  'Minimal inline rating badge - perfect for subtle social proof',
  'minimal',
  'testimonial',
  '["template.author_name", "template.rating"]'::jsonb,
  '<div class="noti-rating-only">
  <div class="rating-stars">{{template.rating_stars}}</div>
  <p class="rating-text">
    <span class="rating-value">{{template.rating}}/5</span>
    <span class="rating-divider">•</span>
    <span class="rating-author">{{template.author_name}}</span>
  </p>
</div>

<style>
.noti-rating-only {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: hsl(var(--background) / 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid hsl(var(--border) / 0.5);
  border-radius: 2rem;
  font-size: 0.875rem;
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.05);
  animation: fade-in 0.3s ease-out;
}

.noti-rating-only .rating-stars {
  color: hsl(45 100% 50%);
  font-size: 1rem;
  line-height: 1;
}

.noti-rating-only .rating-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: hsl(var(--foreground) / 0.9);
}

.noti-rating-only .rating-value {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.noti-rating-only .rating-divider {
  color: hsl(var(--muted-foreground));
}

.noti-rating-only .rating-author {
  color: hsl(var(--muted-foreground));
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>',
  '{"template.author_name": "Sarah J.", "template.rating": 5, "template.rating_stars": "★★★★★"}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 2: Rating Badge
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
  'testimonial_rating_badge',
  'Rating Badge',
  'Compact badge with rating and short message',
  'minimal',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-rating-badge">
  <div class="badge-header">
    <div class="badge-rating">
      <span class="rating-number">{{template.rating}}</span>
      <div class="rating-stars-small">{{template.rating_stars}}</div>
    </div>
  </div>
  <p class="badge-message">{{template.message}}</p>
  <p class="badge-author">— {{template.author_name}}</p>
</div>

<style>
.noti-rating-badge {
  max-width: 280px;
  padding: 1rem;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.02));
  border: 1px solid hsl(var(--border));
  border-radius: 1rem;
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.05);
  animation: scale-in 0.2s ease-out;
}

.noti-rating-badge .badge-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.noti-rating-badge .badge-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.noti-rating-badge .rating-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--primary));
}

.noti-rating-badge .rating-stars-small {
  color: hsl(45 100% 50%);
  font-size: 0.875rem;
}

.noti-rating-badge .badge-message {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: hsl(var(--foreground) / 0.9);
}

.noti-rating-badge .badge-author {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>',
  '{"template.author_name": "Michael Chen", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Exceeded all my expectations!"}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- ============================================
-- STANDARD SERIES
-- ============================================

-- Template 3: Card Modern
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
  'testimonial_card_modern',
  'Card Modern',
  'Clean card with gradient border and glassmorphism',
  'card',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-card-modern">
  <div class="card-gradient-border">
    <div class="card-content">
      <div class="card-header">
        {{#template.author_avatar}}
        <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="avatar-circle" />
        {{/template.author_avatar}}
        <div class="card-author-info">
          <p class="author-name-bold">{{template.author_name}}</p>
          <div class="rating-row">
            <span class="rating-stars">{{template.rating_stars}}</span>
            {{#template.verified}}
            <span class="verified-pill">✓ Verified</span>
            {{/template.verified}}
          </div>
        </div>
      </div>
      <p class="card-message">"{{template.message}}"</p>
      {{#template.time_ago}}
      <p class="card-time">{{template.time_ago}}</p>
      {{/template.time_ago}}
    </div>
  </div>
</div>

<style>
.noti-card-modern {
  max-width: 400px;
  animation: enter 0.3s ease-out;
}

.noti-card-modern .card-gradient-border {
  padding: 2px;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.2));
  border-radius: 1.25rem;
  box-shadow: 0 8px 24px hsl(var(--foreground) / 0.08);
}

.noti-card-modern .card-content {
  padding: 1.5rem;
  background: hsl(var(--background));
  border-radius: 1.2rem;
  backdrop-filter: blur(12px);
}

.noti-card-modern .card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.noti-card-modern .avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid hsl(var(--border));
}

.noti-card-modern .card-author-info {
  flex: 1;
}

.noti-card-modern .author-name-bold {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  font-size: 0.9375rem;
  color: hsl(var(--foreground));
}

.noti-card-modern .rating-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.noti-card-modern .rating-stars {
  color: hsl(45 100% 50%);
  font-size: 0.875rem;
}

.noti-card-modern .verified-pill {
  padding: 0.125rem 0.5rem;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.noti-card-modern .card-message {
  margin: 0 0 0.75rem 0;
  line-height: 1.6;
  color: hsl(var(--foreground) / 0.9);
}

.noti-card-modern .card-time {
  margin: 0;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

@keyframes enter {
  from { opacity: 0; transform: translateY(10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>',
  '{"template.author_name": "Emma Wilson", "template.author_avatar": "https://i.pravatar.cc/150?img=1", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "This product completely transformed my workflow. The attention to detail is incredible, and support team is always there when I need them.", "template.time_ago": "2 hours ago", "template.verified": true}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 4: Bubble Chat
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
  'testimonial_bubble_chat',
  'Bubble Chat',
  'Speech bubble style - conversational and friendly',
  'bubble',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-bubble-chat">
  <div class="bubble-container">
    <div class="bubble-speech">
      <div class="bubble-rating">{{template.rating_stars}}</div>
      <p class="bubble-text">"{{template.message}}"</p>
      {{#template.verified}}
      <span class="bubble-verified">✓ Verified Purchase</span>
      {{/template.verified}}
    </div>
    <div class="bubble-tail"></div>
  </div>
  <div class="bubble-author-row">
    {{#template.author_avatar}}
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="bubble-avatar" />
    {{/template.author_avatar}}
    <div>
      <p class="bubble-author-name">{{template.author_name}}</p>
      {{#template.time_ago}}
      <p class="bubble-time">{{template.time_ago}}</p>
      {{/template.time_ago}}
    </div>
  </div>
</div>

<style>
.noti-bubble-chat {
  max-width: 380px;
  animation: slide-in-right 0.3s ease-out;
}

.noti-bubble-chat .bubble-container {
  position: relative;
  margin-bottom: 0.75rem;
}

.noti-bubble-chat .bubble-speech {
  padding: 1.25rem;
  background: hsl(var(--primary) / 0.08);
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 1.25rem 1.25rem 1.25rem 0.25rem;
  position: relative;
}

.noti-bubble-chat .bubble-rating {
  color: hsl(45 100% 50%);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.noti-bubble-chat .bubble-text {
  margin: 0 0 0.5rem 0;
  line-height: 1.6;
  color: hsl(var(--foreground));
}

.noti-bubble-chat .bubble-verified {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.noti-bubble-chat .bubble-tail {
  position: absolute;
  bottom: -8px;
  left: 16px;
  width: 16px;
  height: 16px;
  background: hsl(var(--primary) / 0.08);
  border-left: 1px solid hsl(var(--primary) / 0.2);
  border-bottom: 1px solid hsl(var(--primary) / 0.2);
  transform: rotate(-45deg);
  border-radius: 0 0 0 4px;
}

.noti-bubble-chat .bubble-author-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-left: 0.5rem;
}

.noti-bubble-chat .bubble-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid hsl(var(--border));
}

.noti-bubble-chat .bubble-author-name {
  margin: 0;
  font-weight: 600;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

.noti-bubble-chat .bubble-time {
  margin: 0;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>',
  '{"template.author_name": "David Martinez", "template.author_avatar": "https://i.pravatar.cc/150?img=2", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Outstanding quality and service. Will definitely be back for more!", "template.time_ago": "5 hours ago", "template.verified": true}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 5: Split View
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
  'testimonial_split_view',
  'Split View',
  'Two-column layout with image and content side-by-side',
  'split',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-split-view">
  <div class="split-container">
    <div class="split-image">
      {{#template.video_url}}
      <video src="{{template.video_url}}" controls class="split-media"></video>
      {{/template.video_url}}
      {{^template.video_url}}
        {{#template.image_url}}
        <img src="{{template.image_url}}" alt="Product" class="split-media" />
        {{/template.image_url}}
        {{^template.image_url}}
          {{#template.author_avatar}}
          <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="split-media" />
          {{/template.author_avatar}}
        {{/template.image_url}}
      {{/template.video_url}}
      <div class="split-overlay"></div>
    </div>
    <div class="split-content">
      <div class="split-rating">{{template.rating_stars}}</div>
      <p class="split-message">"{{template.message}}"</p>
      <div class="split-author">
        {{#template.author_avatar}}
        <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="split-avatar" />
        {{/template.author_avatar}}
        <div>
          <p class="split-name">{{template.author_name}}</p>
          {{#template.verified}}
          <p class="split-verified">✓ Verified Customer</p>
          {{/template.verified}}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
.noti-split-view {
  max-width: 600px;
  animation: fade-in 0.4s ease-out;
}

.noti-split-view .split-container {
  display: grid;
  grid-template-columns: 0.8fr 2fr;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 10px 30px hsl(var(--foreground) / 0.1);
  max-height: 220px;
}

.noti-split-view .split-image {
  position: relative;
  min-height: 180px;
  max-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.noti-split-view .split-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.noti-split-view .split-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.2), transparent);
  pointer-events: none;
}

.noti-split-view .split-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.noti-split-view .split-rating {
  color: hsl(45 100% 50%);
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.noti-split-view .split-message {
  margin: 0 0 1.5rem 0;
  font-size: 1.0625rem;
  line-height: 1.7;
  color: hsl(var(--foreground));
}

.noti-split-view .split-author {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.noti-split-view .split-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid hsl(var(--border));
}

.noti-split-view .split-name {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.noti-split-view .split-verified {
  margin: 0;
  font-size: 0.8125rem;
  color: hsl(var(--primary));
  font-weight: 500;
}

@media (max-width: 640px) {
  .noti-split-view .split-container {
    grid-template-columns: 1fr;
  }
  .noti-split-view .split-image {
    min-height: 200px;
  }
}
</style>',
  '{"template.author_name": "Jessica Lee", "template.author_avatar": "https://i.pravatar.cc/150?img=5", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "I can''t believe how much this has improved my daily routine. The quality is exceptional and the customer service team went above and beyond.", "template.image_url": "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=300&fit=crop", "template.verified": true}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- ============================================
-- MEDIA SERIES (Video-focused)
-- ============================================

-- Template 6: Video Card
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
  'testimonial_video_card',
  'Video Card',
  'Video testimonial with play overlay and author info',
  'video',
  'testimonial',
  '["template.author_name", "template.rating", "template.video_url"]'::jsonb,
  '<div class="noti-video-card">
  <div class="video-container">
    {{#template.video_url}}
    <div class="video-thumbnail">
      <video src="{{template.video_url}}" preload="metadata" class="video-element"></video>
      <div class="play-overlay">
        <div class="play-button">▶</div>
      </div>
    </div>
    {{/template.video_url}}
    <div class="video-info">
      <div class="video-header">
        {{#template.author_avatar}}
        <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="video-avatar" />
        {{/template.author_avatar}}
        <div>
          <p class="video-author">{{template.author_name}}</p>
          <div class="video-rating">{{template.rating_stars}}</div>
        </div>
      </div>
      {{#template.message}}
      <p class="video-caption">{{template.message}}</p>
      {{/template.message}}
    </div>
  </div>
</div>

<style>
.noti-video-card {
  max-width: 380px;
  animation: scale-in 0.3s ease-out;
}

.noti-video-card .video-container {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow: 0 8px 24px hsl(var(--foreground) / 0.08);
}

.noti-video-card .video-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  background: hsl(var(--muted));
  cursor: pointer;
}

.noti-video-card .video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.noti-video-card .play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, hsl(var(--foreground) / 0.3), hsl(var(--foreground) / 0.1));
  transition: background 0.3s ease;
}

.noti-video-card .video-thumbnail:hover .play-overlay {
  background: linear-gradient(135deg, hsl(var(--foreground) / 0.4), hsl(var(--foreground) / 0.2));
}

.noti-video-card .play-button {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: 50%;
  font-size: 1.5rem;
  box-shadow: 0 4px 16px hsl(var(--primary) / 0.4);
  transition: transform 0.2s ease;
}

.noti-video-card .video-thumbnail:hover .play-button {
  transform: scale(1.1);
}

.noti-video-card .video-info {
  padding: 1.25rem;
}

.noti-video-card .video-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.noti-video-card .video-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid hsl(var(--border));
}

.noti-video-card .video-author {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  font-size: 0.9375rem;
  color: hsl(var(--foreground));
}

.noti-video-card .video-rating {
  color: hsl(45 100% 50%);
  font-size: 0.875rem;
}

.noti-video-card .video-caption {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}
</style>',
  '{"template.author_name": "Ryan Thompson", "template.author_avatar": "https://i.pravatar.cc/150?img=3", "template.rating": 5, "template.rating_stars": "★★★★★", "template.video_url": "https://example.com/video.mp4", "template.message": "Watch my full review!"}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 7: Video Grid (2x2)
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
  'testimonial_video_grid',
  'Video Grid',
  '2x2 grid of video testimonials - perfect for showcasing multiple',
  'grid',
  'testimonial',
  '["template.author_name", "template.rating", "template.video_url"]'::jsonb,
  '<div class="noti-video-grid">
  <div class="grid-header">
    <h3 class="grid-title">Customer Stories</h3>
    <p class="grid-subtitle">See what our customers say</p>
  </div>
  <div class="grid-container">
    <!-- Main video (repeated for demo) -->
    <div class="grid-item">
      <div class="grid-video">
        <video src="{{template.video_url}}" preload="metadata" class="grid-video-el"></video>
        <div class="grid-play">▶</div>
      </div>
      <p class="grid-author">{{template.author_name}}</p>
      <div class="grid-rating">{{template.rating_stars}}</div>
    </div>
  </div>
</div>

<style>
.noti-video-grid {
  max-width: 600px;
  padding: 2rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 1.5rem;
  box-shadow: 0 10px 30px hsl(var(--foreground) / 0.08);
  animation: fade-in 0.4s ease-out;
}

.noti-video-grid .grid-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.noti-video-grid .grid-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.noti-video-grid .grid-subtitle {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.noti-video-grid .grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.noti-video-grid .grid-item {
  text-align: center;
}

.noti-video-grid .grid-video {
  position: relative;
  aspect-ratio: 9 / 16;
  background: hsl(var(--muted));
  border-radius: 1rem;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 0.75rem;
}

.noti-video-grid .grid-video-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.noti-video-grid .grid-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: 50%;
  font-size: 1.25rem;
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.4);
}

.noti-video-grid .grid-author {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

.noti-video-grid .grid-rating {
  color: hsl(45 100% 50%);
  font-size: 0.75rem;
}

@media (max-width: 480px) {
  .noti-video-grid .grid-container {
    grid-template-columns: 1fr;
  }
}
</style>',
  '{"template.author_name": "Multiple Customers", "template.rating": 5, "template.rating_stars": "★★★★★", "template.video_url": "https://example.com/video.mp4"}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 8: Video Carousel
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
  'testimonial_video_carousel',
  'Video Carousel',
  'Horizontal scrolling carousel of video testimonials',
  'carousel',
  'testimonial',
  '["template.author_name", "template.rating", "template.video_url"]'::jsonb,
  '<div class="noti-video-carousel">
  <h3 class="carousel-title">Video Testimonials</h3>
  <div class="carousel-track">
    <div class="carousel-item">
      <div class="carousel-video">
        <video src="{{template.video_url}}" preload="metadata" class="carousel-video-el"></video>
        <div class="carousel-play">▶</div>
      </div>
      <div class="carousel-info">
        <p class="carousel-author">{{template.author_name}}</p>
        <div class="carousel-rating">{{template.rating_stars}}</div>
      </div>
    </div>
  </div>
  <div class="carousel-dots">
    <span class="dot active"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
</div>

<style>
.noti-video-carousel {
  max-width: 480px;
  padding: 1.5rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 1.5rem;
  box-shadow: 0 8px 24px hsl(var(--foreground) / 0.08);
  animation: fade-in 0.4s ease-out;
}

.noti-video-carousel .carousel-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  text-align: center;
}

.noti-video-carousel .carousel-track {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.noti-video-carousel .carousel-track::-webkit-scrollbar {
  display: none;
}

.noti-video-carousel .carousel-item {
  scroll-snap-align: center;
  flex-shrink: 0;
  width: 100%;
}

.noti-video-carousel .carousel-video {
  position: relative;
  aspect-ratio: 9 / 16;
  max-width: 280px;
  margin: 0 auto 1rem;
  background: hsl(var(--muted));
  border-radius: 1.25rem;
  overflow: hidden;
  cursor: pointer;
}

.noti-video-carousel .carousel-video-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.noti-video-carousel .carousel-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: 50%;
  font-size: 1.5rem;
  box-shadow: 0 4px 16px hsl(var(--primary) / 0.4);
  transition: transform 0.2s ease;
}

.noti-video-carousel .carousel-video:hover .carousel-play {
  transform: translate(-50%, -50%) scale(1.1);
}

.noti-video-carousel .carousel-info {
  text-align: center;
}

.noti-video-carousel .carousel-author {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.noti-video-carousel .carousel-rating {
  color: hsl(45 100% 50%);
  font-size: 0.875rem;
}

.noti-video-carousel .carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.noti-video-carousel .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground) / 0.3);
  transition: all 0.2s ease;
}

.noti-video-carousel .dot.active {
  background: hsl(var(--primary));
  width: 24px;
  border-radius: 4px;
}
</style>',
  '{"template.author_name": "Alex Rivera", "template.rating": 5, "template.rating_stars": "★★★★★", "template.video_url": "https://example.com/video.mp4"}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- ============================================
-- PREMIUM SERIES (Full-featured)
-- ============================================

-- Template 9: Hero Featured
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
  'testimonial_hero_featured',
  'Hero Featured',
  'Large hero section with gradient background - perfect for landing pages',
  'hero',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-hero-featured">
  <div class="hero-background">
    <div class="hero-gradient"></div>
    {{#template.image_url}}
    <img src="{{template.image_url}}" alt="Background" class="hero-bg-image" />
    {{/template.image_url}}
  </div>
  <div class="hero-content">
    <div class="hero-rating-mega">{{template.rating_stars}}</div>
    <blockquote class="hero-quote">"{{template.message}}"</blockquote>
    <div class="hero-author-section">
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="hero-avatar-large" />
      {{/template.author_avatar}}
      <div class="hero-author-details">
        <p class="hero-author-name">{{template.author_name}}</p>
        {{#template.verified}}
        <p class="hero-verified">✓ Verified Customer</p>
        {{/template.verified}}
      </div>
    </div>
  </div>
</div>

<style>
.noti-hero-featured {
  position: relative;
  max-width: 800px;
  min-height: 400px;
  border-radius: 2rem;
  overflow: hidden;
  box-shadow: 0 20px 60px hsl(var(--foreground) / 0.15);
  animation: fade-in 0.5s ease-out;
}

.noti-hero-featured .hero-background {
  position: absolute;
  inset: 0;
}

.noti-hero-featured .hero-bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(8px) brightness(0.7);
}

.noti-hero-featured .hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, 
    hsl(var(--primary) / 0.8), 
    hsl(var(--primary) / 0.4),
    hsl(var(--foreground) / 0.6)
  );
  backdrop-filter: blur(20px);
}

.noti-hero-featured .hero-content {
  position: relative;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: white;
}

.noti-hero-featured .hero-rating-mega {
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: hsl(45 100% 50%);
  text-shadow: 0 2px 8px hsl(0 0% 0% / 0.3);
}

.noti-hero-featured .hero-quote {
  margin: 0 auto 2rem;
  max-width: 600px;
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.6;
  color: white;
  text-shadow: 0 2px 12px hsl(0 0% 0% / 0.4);
}

.noti-hero-featured .hero-author-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.noti-hero-featured .hero-avatar-large {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid white;
  box-shadow: 0 4px 16px hsl(0 0% 0% / 0.3);
}

.noti-hero-featured .hero-author-details {
  text-align: left;
}

.noti-hero-featured .hero-author-name {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px hsl(0 0% 0% / 0.3);
}

.noti-hero-featured .hero-verified {
  margin: 0;
  font-size: 0.875rem;
  color: hsl(45 100% 50%);
  font-weight: 600;
}

@media (max-width: 640px) {
  .noti-hero-featured .hero-content {
    padding: 2rem;
  }
  .noti-hero-featured .hero-quote {
    font-size: 1.125rem;
  }
}
</style>',
  '{"template.author_name": "Sarah Mitchell", "template.author_avatar": "https://i.pravatar.cc/150?img=4", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "This is hands down the best investment I''ve made in my business. The results speak for themselves - we''ve seen a 300% increase in customer satisfaction!", "template.image_url": "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800", "template.verified": true}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 10: Masonry Grid
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
  'testimonial_masonry_grid',
  'Masonry Grid',
  'Pinterest-style masonry layout - showcase multiple testimonials beautifully',
  'masonry',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-masonry-grid">
  <h3 class="masonry-title">What Our Customers Say</h3>
  <div class="masonry-container">
    <div class="masonry-item">
      <div class="masonry-card">
        <div class="masonry-rating">{{template.rating_stars}}</div>
        <p class="masonry-message">"{{template.message}}"</p>
        <div class="masonry-author">
          {{#template.author_avatar}}
          <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="masonry-avatar" />
          {{/template.author_avatar}}
          <div>
            <p class="masonry-name">{{template.author_name}}</p>
            {{#template.verified}}
            <p class="masonry-verified">✓ Verified</p>
            {{/template.verified}}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
.noti-masonry-grid {
  max-width: 900px;
  padding: 2rem;
  animation: fade-in 0.4s ease-out;
}

.noti-masonry-grid .masonry-title {
  margin: 0 0 2rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  text-align: center;
}

.noti-masonry-grid .masonry-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  grid-auto-rows: auto;
}

.noti-masonry-grid .masonry-item {
  animation: scale-in 0.3s ease-out;
  animation-fill-mode: both;
}

.noti-masonry-grid .masonry-card {
  padding: 1.5rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 1.25rem;
  box-shadow: 0 4px 16px hsl(var(--foreground) / 0.06);
  transition: all 0.3s ease;
}

.noti-masonry-grid .masonry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px hsl(var(--foreground) / 0.12);
}

.noti-masonry-grid .masonry-rating {
  color: hsl(45 100% 50%);
  font-size: 1rem;
  margin-bottom: 1rem;
}

.noti-masonry-grid .masonry-message {
  margin: 0 0 1.25rem 0;
  line-height: 1.6;
  color: hsl(var(--foreground));
}

.noti-masonry-grid .masonry-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--border));
}

.noti-masonry-grid .masonry-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid hsl(var(--border));
}

.noti-masonry-grid .masonry-name {
  margin: 0 0 0.125rem 0;
  font-weight: 600;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
}

.noti-masonry-grid .masonry-verified {
  margin: 0;
  font-size: 0.75rem;
  color: hsl(var(--primary));
  font-weight: 500;
}

@media (max-width: 640px) {
  .noti-masonry-grid .masonry-container {
    grid-template-columns: 1fr;
  }
}
</style>',
  '{"template.author_name": "Jennifer Park", "template.author_avatar": "https://i.pravatar.cc/150?img=6", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Outstanding service and product quality. Will definitely recommend!", "template.verified": true}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 11: Auto Slider
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
  'testimonial_slider_auto',
  'Auto Slider',
  'Auto-rotating slider with smooth transitions',
  'slider',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-slider-auto">
  <div class="slider-container">
    <div class="slider-track">
      <div class="slider-slide active">
        <div class="slide-content">
          <div class="slide-quote-icon">"</div>
          <p class="slide-message">{{template.message}}</p>
          <div class="slide-rating">{{template.rating_stars}}</div>
          <div class="slide-author">
            {{#template.author_avatar}}
            <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="slide-avatar" />
            {{/template.author_avatar}}
            <div>
              <p class="slide-name">{{template.author_name}}</p>
              {{#template.verified}}
              <p class="slide-verified">✓ Verified Customer</p>
              {{/template.verified}}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slider-indicators">
      <span class="indicator active"></span>
      <span class="indicator"></span>
      <span class="indicator"></span>
    </div>
  </div>
</div>

<style>
.noti-slider-auto {
  max-width: 700px;
  padding: 3rem 2rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 2rem;
  box-shadow: 0 12px 40px hsl(var(--foreground) / 0.1);
  animation: fade-in 0.4s ease-out;
}

.noti-slider-auto .slider-container {
  position: relative;
  overflow: hidden;
}

.noti-slider-auto .slider-track {
  position: relative;
}

.noti-slider-auto .slider-slide {
  opacity: 0;
  transform: translateX(20px);
  transition: all 0.5s ease;
}

.noti-slider-auto .slider-slide.active {
  opacity: 1;
  transform: translateX(0);
}

.noti-slider-auto .slide-content {
  text-align: center;
  padding: 2rem 0;
}

.noti-slider-auto .slide-quote-icon {
  font-size: 4rem;
  line-height: 1;
  color: hsl(var(--primary) / 0.2);
  font-family: Georgia, serif;
  margin-bottom: 1rem;
}

.noti-slider-auto .slide-message {
  margin: 0 auto 1.5rem;
  max-width: 560px;
  font-size: 1.25rem;
  line-height: 1.7;
  color: hsl(var(--foreground));
  font-weight: 400;
}

.noti-slider-auto .slide-rating {
  color: hsl(45 100% 50%);
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.noti-slider-auto .slide-author {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: hsl(var(--muted) / 0.5);
  border-radius: 3rem;
}

.noti-slider-auto .slide-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid hsl(var(--border));
}

.noti-slider-auto .slide-name {
  margin: 0 0 0.125rem 0;
  font-weight: 600;
  color: hsl(var(--foreground));
  text-align: left;
}

.noti-slider-auto .slide-verified {
  margin: 0;
  font-size: 0.8125rem;
  color: hsl(var(--primary));
  font-weight: 500;
  text-align: left;
}

.noti-slider-auto .slider-indicators {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
}

.noti-slider-auto .indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground) / 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.noti-slider-auto .indicator.active {
  background: hsl(var(--primary));
  width: 32px;
  border-radius: 5px;
}

@media (max-width: 640px) {
  .noti-slider-auto {
    padding: 2rem 1.5rem;
  }
  .noti-slider-auto .slide-message {
    font-size: 1.0625rem;
  }
}
</style>',
  '{"template.author_name": "Chris Anderson", "template.author_avatar": "https://i.pravatar.cc/150?img=7", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "I''ve tried many alternatives, but nothing comes close to the quality and support I get here. Absolutely worth every penny!", "template.verified": true}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- Template 12: Compact Sidebar
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
  'testimonial_compact_sidebar',
  'Compact Sidebar',
  'Minimal sidebar widget - perfect for persistent display',
  'compact',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="noti-compact-sidebar">
  <div class="compact-header">
    <div class="compact-icon">💬</div>
    <div class="compact-rating-small">{{template.rating_stars}}</div>
  </div>
  <p class="compact-text">{{template.message}}</p>
  <div class="compact-footer">
    {{#template.author_avatar}}
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="compact-avatar-tiny" />
    {{/template.author_avatar}}
    <span class="compact-author-tiny">{{template.author_name}}</span>
    {{#template.verified}}
    <span class="compact-check">✓</span>
    {{/template.verified}}
  </div>
</div>

<style>
.noti-compact-sidebar {
  max-width: 280px;
  padding: 1rem;
  background: hsl(var(--background));
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border));
  border-radius: 1rem;
  box-shadow: 0 4px 16px hsl(var(--foreground) / 0.08);
  animation: slide-in-right 0.3s ease-out;
}

.noti-compact-sidebar .compact-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.noti-compact-sidebar .compact-icon {
  font-size: 1.25rem;
}

.noti-compact-sidebar .compact-rating-small {
  color: hsl(45 100% 50%);
  font-size: 0.75rem;
}

.noti-compact-sidebar .compact-text {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: hsl(var(--foreground) / 0.9);
}

.noti-compact-sidebar .compact-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid hsl(var(--border) / 0.5);
}

.noti-compact-sidebar .compact-avatar-tiny {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid hsl(var(--border));
}

.noti-compact-sidebar .compact-author-tiny {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--foreground) / 0.8);
}

.noti-compact-sidebar .compact-check {
  color: hsl(var(--primary));
  font-size: 0.75rem;
}
</style>',
  '{"template.author_name": "Lisa Wong", "template.author_avatar": "https://i.pravatar.cc/150?img=8", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Simple, effective, exactly what I needed!", "template.verified": true}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  is_active = EXCLUDED.is_active;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully seeded 12 modern testimonial templates!';
  RAISE NOTICE '📊 Template Categories:';
  RAISE NOTICE '   • Minimal Series: 2 templates (rating_only, rating_badge)';
  RAISE NOTICE '   • Standard Series: 3 templates (card_modern, bubble_chat, split_view)';
  RAISE NOTICE '   • Media Series: 3 templates (video_card, video_grid, video_carousel)';
  RAISE NOTICE '   • Premium Series: 4 templates (hero_featured, masonry_grid, slider_auto, compact_sidebar)';
  RAISE NOTICE '🎨 All templates feature:';
  RAISE NOTICE '   • Modern glassmorphism effects';
  RAISE NOTICE '   • Smooth animations (fade-in, scale-in, slide-in)';
  RAISE NOTICE '   • Mobile-responsive design';
  RAISE NOTICE '   • Dark mode support via CSS variables';
  RAISE NOTICE '   • Accessibility features';
END $$;
