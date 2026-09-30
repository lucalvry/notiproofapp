-- ============================================
-- SENJA-STYLE TESTIMONIAL TEMPLATE
-- Horizontal split with video/image left, content right
-- ============================================

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
  'testimonial_senja_split',
  'Testimonial Split (Senja Style)',
  'Horizontal split layout with video/image on left and content on right',
  'card',
  'testimonial',
  '["template.author_name", "template.rating", "template.message"]'::jsonb,
  '<div class="testimonial-senja-split">
  <div class="senja-media-side">
    {{#template.video_url}}
    <div class="senja-video-container">
      {{#template.image_url}}
      <img src="{{template.image_url}}" alt="Video thumbnail" class="senja-thumbnail" />
      {{/template.image_url}}
      {{^template.image_url}}
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="senja-thumbnail" />
      {{/template.author_avatar}}
      {{/template.image_url}}
      <div class="senja-play-overlay">
        <div class="senja-play-button">
          <svg viewBox="0 0 24 24" fill="white" class="senja-play-icon">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </div>
    {{/template.video_url}}
    {{^template.video_url}}
    <div class="senja-image-container">
      {{#template.image_url}}
      <img src="{{template.image_url}}" alt="{{template.author_name}}" class="senja-image" />
      {{/template.image_url}}
      {{^template.image_url}}
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" class="senja-avatar-large" />
      {{/template.author_avatar}}
      {{/template.image_url}}
    </div>
    {{/template.video_url}}
  </div>
  <div class="senja-content-side">
    <div class="senja-rating">{{template.rating_stars}}</div>
    <p class="senja-message">{{template.message}}</p>
    <div class="senja-author">
      <p class="senja-author-name">{{template.author_name}}</p>
      {{#template.author_title}}
      <p class="senja-author-title">{{template.author_title}}</p>
      {{/template.author_title}}
    </div>
  </div>
</div>

<style>
.testimonial-senja-split {
  display: flex;
  gap: 1.5rem;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 500px;
}

.senja-media-side {
  flex: 0 0 140px;
  position: relative;
  background: #f0f0f0;
}

.senja-video-container,
.senja-image-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.senja-thumbnail,
.senja-image,
.senja-avatar-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.senja-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
}

.senja-play-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.senja-play-icon {
  width: 24px;
  height: 24px;
  margin-left: 3px;
}

.senja-content-side {
  flex: 1;
  padding: 1.25rem 1.5rem 1.25rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.senja-rating {
  color: #ff6b35;
  font-size: 1rem;
  letter-spacing: 2px;
}

.senja-message {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
  margin: 0;
}

.senja-author {
  margin-top: auto;
}

.senja-author-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #111;
  margin: 0 0 0.125rem 0;
}

.senja-author-title {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
}
</style>',
  '{"template.author_name": "Brad Cumbers", "template.author_title": "Co-founder & CEO Martialytics", "template.author_avatar": "https://i.pravatar.cc/150?img=12", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "I sent a link to all of my customers and I''ve had twenty testimonials in two days. It''s obviously very easy to use, otherwise.", "template.video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "template.image_url": "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=300"}'::jsonb,
  true
);