-- Add beautiful live_visitors templates with media+text format
INSERT INTO templates (provider, template_key, name, description, style_variant, html_template, required_fields, preview_json, is_active, category)
VALUES 
  -- Social Proof Card - Media + Text layout
  (
    'live_visitors',
    'visitors_social_proof',
    'Social Proof Card',
    'Clean media + text layout with icon and visitor count',
    'social_proof',
    '<div class="visitors-notification social-proof">
      <div class="visitors-icon">{{icon}}</div>
      <div class="visitors-content">
        <div class="visitors-count">{{count}} {{message}}</div>
        {{#location}}<div class="visitors-location">from {{location}}</div>{{/location}}
      </div>
    </div>',
    '["template.count", "template.message"]',
    '{"icon": "👥", "count": 23, "message": "people are viewing this page", "location": "United States"}',
    true,
    'live_visitors'
  ),
  -- Compact Badge
  (
    'live_visitors',
    'visitors_compact_badge',
    'Compact Badge',
    'Minimal pill-style notification',
    'compact',
    '<div class="visitors-notification compact">
      <span class="visitors-icon">{{icon}}</span>
      <span class="visitors-text">{{count}} {{message}}</span>
    </div>',
    '["template.count", "template.message"]',
    '{"icon": "👀", "count": 12, "message": "viewing now"}',
    true,
    'live_visitors'
  ),
  -- Live Counter with Pulse
  (
    'live_visitors',
    'visitors_live_counter',
    'Live Counter',
    'Animated pulsing dot with live count',
    'animated',
    '<div class="visitors-notification animated">
      <div class="pulse-dot"></div>
      <div class="visitors-content">
        <div class="visitors-count"><strong>{{count}}</strong> {{message}}</div>
        {{#location}}<div class="visitors-meta">{{location}}</div>{{/location}}
      </div>
    </div>',
    '["template.count", "template.message"]',
    '{"count": 18, "message": "people online now", "location": "Multiple countries"}',
    true,
    'live_visitors'
  ),
  -- Urgency Banner
  (
    'live_visitors',
    'visitors_urgency_banner',
    'Urgency Banner',
    'Bold, attention-grabbing banner style',
    'urgency',
    '<div class="visitors-notification urgency">
      <span class="urgency-icon">🔥</span>
      <span class="urgency-text">{{prefix}} <strong>{{count}}</strong> {{message}}</span>
    </div>',
    '["template.count", "template.message"]',
    '{"prefix": "HOT -", "count": 45, "message": "people viewing right now!"}',
    true,
    'live_visitors'
  ),
  -- Location Rich
  (
    'live_visitors',
    'visitors_location_rich',
    'Location Rich',
    'Shows visitor breakdown by location',
    'detailed',
    '<div class="visitors-notification detailed">
      <div class="visitors-icon globe">🌍</div>
      <div class="visitors-content">
        <div class="visitors-count">{{count}} {{message}}</div>
        <div class="visitors-locations">{{location_list}}</div>
      </div>
    </div>',
    '["template.count", "template.message"]',
    '{"count": 34, "message": "visitors worldwide", "location_list": "USA, UK, Canada, Germany"}',
    true,
    'live_visitors'
  );