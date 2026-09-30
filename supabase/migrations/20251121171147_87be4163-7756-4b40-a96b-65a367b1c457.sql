-- ============================================
-- ADD BUBBLE AND HERO TESTIMONIAL TEMPLATES
-- ============================================

INSERT INTO public.templates (provider, template_key, name, description, style_variant, category, required_fields, html_template, preview_json, is_active) VALUES

-- ============================================
-- BUBBLE VARIANT
-- ============================================
('testimonials', 'testimonial_bubble_v1', 'Testimonial - Bubble', 'Speech bubble style testimonial with compact design', 'bubble', 'testimonial',
'["template.author_name", "template.rating", "template.message"]'::jsonb,
'<div style="position: relative; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 20px; max-width: 380px; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3); margin: 20px auto;">
  <!-- Bubble tail -->
  <div style="position: absolute; bottom: -10px; left: 30px; width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 15px solid #764ba2;"></div>
  
  <!-- Rating -->
  <div style="display: flex; gap: 4px; margin-bottom: 12px;">
    <span style="color: #fbbf24; font-size: 18px;">{{template.rating_stars}}</span>
  </div>
  
  <!-- Message -->
  <p style="color: #ffffff; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; font-weight: 400;">
    "{{template.message}}"
  </p>
  
  <!-- Author -->
  <div style="display: flex; align-items: center; gap: 12px;">
    {{#template.author_avatar}}
    <img src="{{template.author_avatar}}" alt="{{template.author_name}}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.3); object-fit: cover;" />
    {{/template.author_avatar}}
    <div>
      <p style="color: #ffffff; font-weight: 600; font-size: 14px; margin: 0; line-height: 1.2;">{{template.author_name}}</p>
      {{#template.author_title}}
      <p style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 4px 0 0 0; line-height: 1.2;">{{template.author_title}}</p>
      {{/template.author_title}}
    </div>
  </div>
  
  {{#template.verified}}
  <div style="display: inline-flex; align-items: center; gap: 4px; margin-top: 12px; padding: 4px 10px; background: rgba(255, 255, 255, 0.2); border-radius: 12px;">
    <span style="color: #10b981; font-size: 12px;">✓</span>
    <span style="color: #ffffff; font-size: 11px; font-weight: 500;">Verified Customer</span>
  </div>
  {{/template.verified}}
</div>',
'{"template.author_name": "Sarah Johnson", "template.author_avatar": "https://i.pravatar.cc/150?img=5", "template.author_title": "Marketing Director", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "This product has completely transformed how our team works. The results were immediate and impressive!", "template.verified": true}'::jsonb,
true),

-- ============================================
-- HERO VARIANT
-- ============================================
('testimonials', 'testimonial_hero_v1', 'Testimonial - Hero', 'Large full-width testimonial card ideal for landing pages', 'hero', 'testimonial',
'["template.author_name", "template.rating", "template.message"]'::jsonb,
'<div style="position: relative; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 24px; padding: 40px; max-width: 800px; margin: 20px auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); overflow: hidden;">
  <!-- Background decoration -->
  <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%); border-radius: 50%;"></div>
  
  <div style="display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: start; position: relative; z-index: 1;">
    <!-- Left: Avatar and Info -->
    <div style="text-align: center; min-width: 120px;">
      {{#template.author_avatar}}
      <img src="{{template.author_avatar}}" alt="{{template.author_name}}" style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid rgba(139, 92, 246, 0.3); object-fit: cover; margin-bottom: 16px; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);" />
      {{/template.author_avatar}}
      
      <h3 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 4px 0; line-height: 1.2;">{{template.author_name}}</h3>
      
      {{#template.author_title}}
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0; line-height: 1.3;">{{template.author_title}}</p>
      {{/template.author_title}}
      
      {{#template.company}}
      <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.3;">{{template.company}}</p>
      {{/template.company}}
      
      <!-- Rating -->
      <div style="display: flex; justify-content: center; gap: 4px; margin-top: 12px;">
        <span style="color: #fbbf24; font-size: 16px;">{{template.rating_stars}}</span>
      </div>
      
      {{#template.verified}}
      <div style="display: inline-flex; align-items: center; gap: 4px; margin-top: 12px; padding: 6px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px;">
        <span style="color: #10b981; font-size: 14px;">✓</span>
        <span style="color: #10b981; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Verified</span>
      </div>
      {{/template.verified}}
    </div>
    
    <!-- Right: Testimonial Content -->
    <div>
      <!-- Quote icon -->
      <div style="color: rgba(139, 92, 246, 0.4); font-size: 48px; line-height: 1; margin-bottom: 16px; font-family: Georgia, serif;">"</div>
      
      <!-- Message -->
      <p style="color: #e2e8f0; font-size: 20px; line-height: 1.7; margin: 0 0 20px 0; font-weight: 400; font-style: italic;">
        {{template.message}}
      </p>
      
      {{#template.image_url}}
      <div style="margin-top: 24px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);">
        <img src="{{template.image_url}}" alt="Testimonial" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: cover;" />
      </div>
      {{/template.image_url}}
      
      {{#template.cta_url}}
      <div style="margin-top: 24px;">
        <a href="{{template.cta_url}}" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);">
          {{template.cta_text}}
          <span style="font-size: 16px;">→</span>
        </a>
      </div>
      {{/template.cta_url}}
    </div>
  </div>
</div>',
'{"template.author_name": "Alex Rodriguez", "template.author_avatar": "https://i.pravatar.cc/150?img=8", "template.author_title": "CEO & Founder", "template.company": "TechVision Inc.", "template.rating": 5, "template.rating_stars": "★★★★★", "template.message": "Working with this team has been a game-changer for our business. The attention to detail, responsiveness, and quality of work exceeded all our expectations. I cannot recommend them highly enough!", "template.image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800", "template.verified": true, "template.cta_text": "Learn More", "template.cta_url": "#"}'::jsonb,
true)