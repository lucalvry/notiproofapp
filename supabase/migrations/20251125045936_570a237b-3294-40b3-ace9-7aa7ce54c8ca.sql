-- Fix testimonial_split_view: Add background and remove duplicate avatar
UPDATE public.templates
SET html_template = '<div class="noti-split-view">
  <div class="split-image">
    {{#template.video_url}}
    <video src="{{template.video_url}}" class="split-media split-video" autoplay muted loop playsinline></video>
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
  </div>
  <div class="split-content">
    <div class="split-rating">{{template.rating_stars}}</div>
    <p class="split-message">"{{template.message}}"</p>
    <div class="split-author">
      <div>
        <p class="split-name">{{template.author_name}}</p>
        {{#template.author_position}}
        <p class="split-position">{{template.author_position}}{{#template.author_company}} at {{template.author_company}}{{/template.author_company}}</p>
        {{/template.author_position}}
        {{#template.verified}}<span class="split-verified">✓ Verified</span>{{/template.verified}}
      </div>
    </div>
    {{#template.time_ago}}<p class="split-time">{{template.time_ago}}</p>{{/template.time_ago}}
  </div>
</div>

<style>
.noti-split-view {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: hsl(var(--card));
}

.noti-split-view .split-image {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
}

.noti-split-view .split-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.noti-split-view .split-video {
  object-fit: cover;
}

.noti-split-view .split-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
}

.noti-split-view .split-rating {
  color: hsl(var(--primary));
  font-size: 1.25rem;
  margin-bottom: 1rem;
  letter-spacing: 0.05em;
}

.noti-split-view .split-message {
  font-size: 1rem;
  line-height: 1.6;
  color: hsl(var(--foreground));
  margin-bottom: 1.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.noti-split-view .split-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.noti-split-view .split-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: hsl(var(--foreground));
  margin: 0;
}

.noti-split-view .split-position {
  font-size: 0.85rem;
  color: hsl(var(--muted-foreground));
  margin: 0.25rem 0 0 0;
}

.noti-split-view .split-verified {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  color: hsl(var(--primary));
  font-weight: 500;
  margin-top: 0.25rem;
}

.noti-split-view .split-time {
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

@media (max-width: 640px) {
  .noti-split-view {
    grid-template-columns: 0.6fr 1.4fr;
    min-height: 200px;
  }
  
  .noti-split-view .split-image {
    min-height: 200px;
    max-height: 200px;
  }
  
  .noti-split-view .split-content {
    padding: 1rem;
  }
  
  .noti-split-view .split-rating {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .noti-split-view .split-message {
    font-size: 0.85rem;
    line-height: 1.5;
    margin-bottom: 0.75rem;
    -webkit-line-clamp: 3;
  }
  
  .noti-split-view .split-name {
    font-size: 0.85rem;
  }
  
  .noti-split-view .split-position {
    font-size: 0.75rem;
  }
  
  .noti-split-view .split-verified {
    font-size: 0.7rem;
  }
  
  .noti-split-view .split-time {
    font-size: 0.7rem;
  }
}
</style>',
updated_at = now()
WHERE template_key = 'testimonial_split_view';