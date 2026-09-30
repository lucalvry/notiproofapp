-- Update announcement templates with inline styles for proper preview rendering

UPDATE templates
SET html_template = '<div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
  <div style="font-size: 24px;">{{template.icon}}</div>
  <div style="flex: 1;">
    <h4 style="margin: 0; font-size: 16px; font-weight: 600;">{{template.title}}</h4>
    <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">{{template.message}}</p>
  </div>
  {{#template.cta_url}}
  <a href="{{template.cta_url}}" style="padding: 8px 16px; background: rgba(255,255,255,0.2); border-radius: 6px; text-decoration: none; color: white; font-weight: 500; transition: background 0.2s;">{{template.cta_text}}</a>
  {{/template.cta_url}}
</div>',
  updated_at = now()
WHERE name = 'Announcement - Banner';

UPDATE templates
SET html_template = '<div style="text-align: center; padding: 32px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
  {{#template.image_url}}
  <img src="{{template.image_url}}" alt="{{template.title}}" style="width: 100%; max-width: 400px; height: auto; border-radius: 8px; margin-bottom: 20px;" />
  {{/template.image_url}}
  <div style="font-size: 32px; margin-bottom: 12px;">{{template.icon}}</div>
  <h2 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700;">{{template.title}}</h2>
  <p style="margin: 0 0 24px 0; font-size: 16px; opacity: 0.95; max-width: 500px; margin-left: auto; margin-right: auto;">{{template.message}}</p>
  {{#template.cta_url}}
  <a href="{{template.cta_url}}" style="display: inline-block; padding: 12px 32px; background: white; color: #f5576c; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: transform 0.2s;">{{template.cta_text}}</a>
  {{/template.cta_url}}
</div>',
  updated_at = now()
WHERE name = 'Announcement - Hero';