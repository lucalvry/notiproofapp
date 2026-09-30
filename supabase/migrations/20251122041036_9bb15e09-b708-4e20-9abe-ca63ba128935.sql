-- Restore the Split View template (renamed from Senja)
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
  'Testimonial Split View',
  'Two-column layout with image and testimonial text side-by-side',
  'split',
  'testimonial',
  '["template.author_name", "template.message", "template.author_avatar", "template.rating"]'::jsonb,
  '<div class="noti-split-view">
  <div class="split-image">
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" />
  </div>
  <div class="split-content">
    <div class="rating-stars">{{template.rating_stars}}</div>
    <p class="testimonial-message">{{template.message}}</p>
    <div class="author-info">
      <p class="author-name">{{template.author_name}}</p>
      <p class="author-title">{{template.author_title}}</p>
    </div>
  </div>
</div>

<style>
.noti-split-view {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.08);
  max-width: 500px;
  animation: slide-in 0.4s ease-out;
}

.noti-split-view .split-image img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 0.5rem;
}

.noti-split-view .split-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.noti-split-view .rating-stars {
  color: hsl(45 100% 50%);
  font-size: 1rem;
}

.noti-split-view .testimonial-message {
  font-size: 0.875rem;
  line-height: 1.5;
  color: hsl(var(--foreground) / 0.9);
  margin: 0;
}

.noti-split-view .author-info {
  margin-top: auto;
}

.noti-split-view .author-name {
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0;
  color: hsl(var(--foreground));
}

.noti-split-view .author-title {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@media (max-width: 640px) {
  .noti-split-view {
    grid-template-columns: 1fr;
  }
  
  .noti-split-view .split-image img {
    height: 200px;
  }
}
</style>',
  '{"template.author_name": "John Smith", "template.message": "This product exceeded my expectations!", "template.author_avatar": "https://ui-avatars.com/api/?name=John+Smith", "template.rating": 5, "template.rating_stars": "★★★★★", "template.author_title": "Verified Customer"}'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  updated_at = now();