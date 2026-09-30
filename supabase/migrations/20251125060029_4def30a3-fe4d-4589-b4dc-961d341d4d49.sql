-- Fix testimonial split view template dimensions
-- 30% media column / 70% text column (0.857fr 2fr ratio)
-- Fixed height: 144px
-- Width range: 384px - 420px

UPDATE public.templates
SET 
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
  min-width: 384px;
  max-width: 420px;
  width: 100%;
  animation: fade-in 0.4s ease-out;
}

.noti-split-view .split-container {
  display: grid;
  grid-template-columns: 0.857fr 2fr;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 10px 30px hsl(var(--foreground) / 0.1);
  height: 144px;
  max-height: 144px;
}

.noti-split-view .split-image {
  position: relative;
  height: 144px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: hsl(var(--muted) / 0.3);
}

.noti-split-view .split-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.noti-split-view .split-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.15), transparent);
  pointer-events: none;
}

.noti-split-view .split-content {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.noti-split-view .split-rating {
  color: hsl(45 100% 50%);
  font-size: 0.9375rem;
  margin-bottom: 0.5rem;
  line-height: 1;
}

.noti-split-view .split-message {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.noti-split-view .split-author {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: auto;
}

.noti-split-view .split-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid hsl(var(--border));
  flex-shrink: 0;
}

.noti-split-view .split-name {
  margin: 0 0 0.125rem 0;
  font-weight: 600;
  font-size: 0.8125rem;
  color: hsl(var(--foreground));
  line-height: 1.2;
}

.noti-split-view .split-verified {
  margin: 0;
  font-size: 0.6875rem;
  color: hsl(var(--primary));
  font-weight: 500;
  line-height: 1;
}

/* Mobile: Maintain same 30/70 ratio and 144px height */
@media (max-width: 640px) {
  .noti-split-view {
    min-width: 320px;
    max-width: 100%;
  }
  
  .noti-split-view .split-container {
    grid-template-columns: 0.857fr 2fr;
    height: 144px;
    max-height: 144px;
  }
  
  .noti-split-view .split-image {
    height: 144px;
  }
  
  .noti-split-view .split-content {
    padding: 1rem 1.25rem;
  }
  
  .noti-split-view .split-rating {
    font-size: 0.875rem;
  }
  
  .noti-split-view .split-message {
    font-size: 0.8125rem;
    line-height: 1.35;
    -webkit-line-clamp: 2;
  }
  
  .noti-split-view .split-avatar {
    width: 28px;
    height: 28px;
  }
  
  .noti-split-view .split-name {
    font-size: 0.75rem;
  }
  
  .noti-split-view .split-verified {
    font-size: 0.625rem;
  }
}

/* Extra small devices */
@media (max-width: 384px) {
  .noti-split-view {
    min-width: 280px;
  }
  
  .noti-split-view .split-container {
    grid-template-columns: 0.857fr 2fr;
    height: 144px;
  }
  
  .noti-split-view .split-content {
    padding: 0.875rem 1rem;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .noti-split-view .split-container {
    grid-template-columns: 0.857fr 2fr;
    height: 144px;
    max-height: 144px;
  }
}
</style>',
  updated_at = now()
WHERE template_key = 'testimonial_split_view' 
  AND provider = 'testimonials';