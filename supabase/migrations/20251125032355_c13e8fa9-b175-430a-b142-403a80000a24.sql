-- Update testimonial_split_view template to include author_position and author_company
UPDATE public.templates
SET 
  required_fields = '["template.author_name", "template.message", "template.author_avatar", "template.rating", "template.author_position", "template.author_company"]'::jsonb,
  html_template = '<div class="noti-split-view">
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
          {{#template.author_position}}{{#template.author_company}}
          <p class="split-title">{{template.author_position}} / {{template.author_company}}</p>
          {{/template.author_company}}{{/template.author_position}}
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

.noti-split-view .split-title {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
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
  preview_json = '{"template.author_name": "Jessica Chen", "template.author_avatar": "https://i.pravatar.cc/150?img=8", "template.author_position": "Co-founder & CEO", "template.author_company": "Martialytics", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "This product has completely transformed how we operate. The team is responsive and the results speak for themselves.", "template.video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "template.verified": true}'::jsonb,
  updated_at = now()
WHERE template_key = 'testimonial_split_view' AND provider = 'testimonials';