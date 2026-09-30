-- Fix Announcement Templates with Inline Styles
-- This migration updates announcement templates to include proper inline styles
-- so they render correctly without external CSS dependencies

UPDATE public.templates
SET html_template = '<div style="display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3); max-width: 600px; margin: 0 auto;">
  <div style="font-size: 32px; flex-shrink: 0;">{{template.icon}}</div>
  <div style="flex: 1; color: white;">
    <h4 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: white;">{{template.title}}</h4>
    <p style="margin: 0; font-size: 14px; opacity: 0.9; color: white;">{{template.message}}</p>
  </div>
  {{#template.cta_url}}
  <a href="{{template.cta_url}}" style="padding: 10px 20px; background: white; color: #667eea; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; white-space: nowrap; transition: transform 0.2s;">{{template.cta_text}}</a>
  {{/template.cta_url}}
</div>'
WHERE template_key = 'announcement_banner_v1';

UPDATE public.templates
SET html_template = '<div style="position: relative; padding: 48px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4); max-width: 800px; margin: 0 auto; overflow: hidden;">
  {{#template.image_url}}
  <img src="{{template.image_url}}" alt="{{template.title}}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.15; z-index: 0;" />
  {{/template.image_url}}
  <div style="position: relative; z-index: 1; text-align: center; color: white;">
    <div style="font-size: 48px; margin-bottom: 16px;">{{template.icon}}</div>
    <h2 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 700; color: white;">{{template.title}}</h2>
    <p style="margin: 0 0 24px 0; font-size: 18px; opacity: 0.95; color: white; max-width: 600px; margin-left: auto; margin-right: auto;">{{template.message}}</p>
    {{#template.cta_url}}
    <a href="{{template.cta_url}}" style="display: inline-block; padding: 14px 32px; background: white; color: #667eea; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); transition: transform 0.2s;">{{template.cta_text}}</a>
    {{/template.cta_url}}
  </div>
</div>'
WHERE template_key = 'announcement_hero_v1';

-- Verify the updates
SELECT template_key, name, 
       CASE 
         WHEN html_template LIKE '%style=%' THEN 'Has inline styles ✓'
         ELSE 'Missing inline styles ✗'
       END as style_check
FROM public.templates
WHERE provider = 'announcements';