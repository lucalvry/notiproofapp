-- ============================================
-- Seed 6 New Announcement Template Variations
-- ============================================

-- 1. Announcement - Modal (center popup overlay)
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('announcements', 'announcement_modal_v1', 'Announcement - Modal', 'Centered modal popup with backdrop overlay', 'modal', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 9999; animation: modalFadeIn 0.3s ease;">
  <div style="text-align: center; color: white;">
    <div style="font-size: 48px; margin-bottom: 16px;">{{template.icon}}</div>
    <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; line-height: 1.3;">{{template.title}}</h2>
    <p style="font-size: 16px; margin-bottom: 24px; opacity: 0.95; line-height: 1.6;">{{template.message}}</p>
    {{#template.cta_url}}
    <a href="{{template.cta_url}}" style="display: inline-block; background: white; color: #667eea; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s;">{{template.cta_text}}</a>
    {{/template.cta_url}}
  </div>
</div>
<style>@keyframes modalFadeIn { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); }}</style>',
'{"template": {"icon": "🎉", "title": "Exciting News!", "message": "We just launched something amazing that you need to see.", "cta_text": "Check It Out", "cta_url": "#modal"}}'::jsonb,
true);

-- 2. Announcement - Corner Popup (bottom-right notification)
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('announcements', 'announcement_corner_v1', 'Announcement - Corner Popup', 'Bottom-right corner notification popup', 'corner', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div style="position: fixed; bottom: 24px; right: 24px; background: white; border-radius: 12px; padding: 20px; max-width: 360px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border-left: 4px solid #10b981; z-index: 9999; animation: slideInRight 0.4s ease;">
  <div style="display: flex; align-items: start; gap: 12px;">
    <div style="font-size: 32px; flex-shrink: 0;">{{template.icon}}</div>
    <div style="flex: 1;">
      <h4 style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 6px;">{{template.title}}</h4>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 12px; line-height: 1.5;">{{template.message}}</p>
      {{#template.cta_url}}
      <a href="{{template.cta_url}}" style="display: inline-block; color: #10b981; font-size: 14px; font-weight: 600; text-decoration: none;">{{template.cta_text}} →</a>
      {{/template.cta_url}}
    </div>
  </div>
</div>
<style>@keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); }}</style>',
'{"template": {"icon": "💡", "title": "Pro Tip", "message": "Did you know you can save time with keyboard shortcuts?", "cta_text": "Learn More", "cta_url": "#corner"}}'::jsonb,
true);

-- 3. Announcement - Top Bar (full-width banner at top)
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('announcements', 'announcement_topbar_v1', 'Announcement - Top Bar', 'Full-width sticky banner at page top', 'topbar', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div style="position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%); padding: 12px 20px; z-index: 9998; box-shadow: 0 4px 12px rgba(0,0,0,0.1); animation: slideDown 0.3s ease;">
  <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
      <span style="font-size: 24px;">{{template.icon}}</span>
      <div>
        <span style="color: white; font-weight: 600; font-size: 15px; margin-right: 8px;">{{template.title}}</span>
        <span style="color: rgba(255,255,255,0.95); font-size: 14px;">{{template.message}}</span>
      </div>
    </div>
    {{#template.cta_url}}
    <a href="{{template.cta_url}}" style="background: white; color: #ef4444; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; white-space: nowrap;">{{template.cta_text}}</a>
    {{/template.cta_url}}
  </div>
</div>
<style>@keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); }}</style>',
'{"template": {"icon": "🔥", "title": "Limited Time Offer", "message": "Get 50% off all premium features this weekend only!", "cta_text": "Claim Deal", "cta_url": "#topbar"}}'::jsonb,
true);

-- 4. Announcement - Side Slide (slides in from right)
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('announcements', 'announcement_slide_v1', 'Announcement - Side Slide', 'Vertical panel sliding from right edge', 'slide', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div style="position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 90vw; background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 32px; box-shadow: -8px 0 32px rgba(0,0,0,0.2); z-index: 9999; animation: slideInFromRight 0.4s ease; overflow-y: auto;">
  <div style="color: white;">
    <div style="font-size: 64px; margin-bottom: 24px;">{{template.icon}}</div>
    <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 16px; line-height: 1.2;">{{template.title}}</h2>
    <p style="font-size: 16px; margin-bottom: 32px; opacity: 0.95; line-height: 1.7;">{{template.message}}</p>
    {{#template.cta_url}}
    <a href="{{template.cta_url}}" style="display: inline-block; background: white; color: #6366f1; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">{{template.cta_text}}</a>
    {{/template.cta_url}}
  </div>
</div>
<style>@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); }}</style>',
'{"template": {"icon": "🚀", "title": "Product Launch", "message": "Introducing our most powerful update yet. Experience features that will transform your workflow.", "cta_text": "Explore Features", "cta_url": "#slide"}}'::jsonb,
true);

-- 5. Announcement - Minimal Toast (compact notification)
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('announcements', 'announcement_toast_v1', 'Announcement - Minimal Toast', 'Compact minimalist notification toast', 'compact', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(17, 24, 39, 0.95); backdrop-filter: blur(12px); border-radius: 12px; padding: 16px 24px; max-width: 480px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 9999; animation: toastFadeIn 0.3s ease;">
  <div style="display: flex; align-items: center; gap: 12px;">
    <span style="font-size: 24px;">{{template.icon}}</span>
    <div style="flex: 1;">
      <div style="font-size: 14px; font-weight: 600; color: white; margin-bottom: 2px;">{{template.title}}</div>
      <div style="font-size: 13px; color: rgba(255,255,255,0.8);">{{template.message}}</div>
    </div>
    {{#template.cta_url}}
    <a href="{{template.cta_url}}" style="color: #60a5fa; font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap;">{{template.cta_text}}</a>
    {{/template.cta_url}}
  </div>
</div>
<style>@keyframes toastFadeIn { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); }}</style>',
'{"template": {"icon": "✨", "title": "Update Available", "message": "A new version is ready to install", "cta_text": "Update Now", "cta_url": "#toast"}}'::jsonb,
true);

-- 6. Announcement - Video Hero (hero with video/image background)
INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES
('announcements', 'announcement_video_v1', 'Announcement - Video Hero', 'Large hero announcement with media background', 'video', 'announcement',
'["template.title", "template.message"]'::jsonb,
'<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(147, 51, 234, 0.95) 100%); z-index: 9998; animation: heroFadeIn 0.5s ease;">
  {{#template.image_url}}
  <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: url({{template.image_url}}); background-size: cover; background-position: center; opacity: 0.3;"></div>
  {{/template.image_url}}
  <div style="position: relative; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; color: white;">
    <div style="font-size: 80px; margin-bottom: 24px;">{{template.icon}}</div>
    <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 20px; line-height: 1.2; max-width: 800px;">{{template.title}}</h1>
    <p style="font-size: 20px; margin-bottom: 40px; opacity: 0.95; line-height: 1.6; max-width: 600px;">{{template.message}}</p>
    {{#template.cta_url}}
    <a href="{{template.cta_url}}" style="display: inline-block; background: white; color: #3b82f6; padding: 18px 48px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">{{template.cta_text}}</a>
    {{/template.cta_url}}
  </div>
</div>
<style>@keyframes heroFadeIn { from { opacity: 0; } to { opacity: 1; }}</style>',
'{"template": {"icon": "🎬", "title": "Watch Our Story", "message": "Discover how we are changing the industry one innovation at a time.", "cta_text": "Watch Video", "cta_url": "#video", "image_url": ""}}'::jsonb,
true);