-- Insert 5 new dynamic Visitors Pulse templates with clickable page links

-- Template 1: Page Viewer with Clickable Link
INSERT INTO templates (
  name,
  template_key,
  provider,
  style_variant,
  html_template,
  description,
  category,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'Page Viewer with Link',
  'live_visitors_page_link',
  'live_visitors',
  'social_proof',
  '<div class="visitors-notification page-viewer">
    <div class="visitors-icon">👁️</div>
    <div class="visitors-content">
      <div class="visitors-count">
        <strong>{{count}}</strong> people are viewing 
        <a href="{{page_url}}" style="color: #667eea; text-decoration: underline;">{{page_name}}</a>
      </div>
      {{#location}}<div class="visitors-meta">from {{location}}</div>{{/location}}
    </div>
  </div>',
  'Shows visitor count with clickable page link',
  'visitors_pulse',
  '["count", "page_name", "page_url"]',
  '{"count": 23, "page_name": "Products", "page_url": "/shop/products", "location": "United States"}',
  true
);

-- Template 2: Shop Activity Pulse
INSERT INTO templates (
  name,
  template_key,
  provider,
  style_variant,
  html_template,
  description,
  category,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'Shop Activity Pulse',
  'live_visitors_shop_pulse',
  'live_visitors',
  'animated',
  '<div class="visitors-notification shop-pulse">
    <div class="pulse-indicator">🛒</div>
    <div class="visitors-content">
      <strong>{{count}}</strong> shoppers browsing 
      <a href="{{page_url}}" style="color: #667eea; font-weight: 600;">the {{page_name}} page</a> right now!
      {{#location}}<div class="visitors-location">📍 {{location}}</div>{{/location}}
    </div>
  </div>',
  'Animated shop activity with clickable page link',
  'visitors_pulse',
  '["count", "page_name", "page_url"]',
  '{"count": 15, "page_name": "Shop", "page_url": "/shop", "location": "New York"}',
  true
);

-- Template 3: Product Interest Alert
INSERT INTO templates (
  name,
  template_key,
  provider,
  style_variant,
  html_template,
  description,
  category,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'Product Interest Alert',
  'live_visitors_product_interest',
  'live_visitors',
  'product',
  '<div class="visitors-notification product-interest">
    <div class="icon-circle">🛍️</div>
    <div class="content">
      <span class="highlight">{{count}}</span> customers interested in 
      <a href="{{page_url}}" class="page-link" style="color: #8b5cf6; text-decoration: underline;">{{page_name}}</a>
      <div class="sub-text" style="font-size: 11px; color: #8b5cf6;">Don''t miss out!</div>
    </div>
  </div>',
  'Product interest notification with urgency messaging',
  'visitors_pulse',
  '["count", "page_name", "page_url"]',
  '{"count": 8, "page_name": "Summer Collection", "page_url": "/collections/summer", "location": "California"}',
  true
);

-- Template 4: Dynamic Page Activity (Hot/Popular)
INSERT INTO templates (
  name,
  template_key,
  provider,
  style_variant,
  html_template,
  description,
  category,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'Popular Page Alert',
  'live_visitors_popular_page',
  'live_visitors',
  'animated',
  '<div class="visitors-notification dynamic-activity">
    <div class="activity-badge">🔥</div>
    <div class="message">
      <strong>{{count}}</strong> visitors on 
      <a href="{{page_url}}" style="color: #f97316; text-decoration: underline; font-weight: 600;">{{page_name}}</a>
      {{#location}}<span class="from" style="font-size: 12px; opacity: 0.7;"> from {{location}}</span>{{/location}}
    </div>
  </div>',
  'Shows popular page with hot/trending indicator',
  'visitors_pulse',
  '["count", "page_name", "page_url"]',
  '{"count": 42, "page_name": "Best Sellers", "page_url": "/best-sellers", "location": "Worldwide"}',
  true
);

-- Template 5: Checkout Urgency
INSERT INTO templates (
  name,
  template_key,
  provider,
  style_variant,
  html_template,
  description,
  category,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'Checkout Urgency',
  'live_visitors_checkout_urgency',
  'live_visitors',
  'checkout',
  '<div class="visitors-notification checkout-urgency">
    <div class="urgency-icon">⚡</div>
    <div class="urgency-message">
      <strong>{{count}}</strong> people are checking out on 
      <a href="{{page_url}}" style="color: #dc2626; text-decoration: underline; font-weight: 600;">{{page_name}}</a>
      <div class="cta" style="font-size: 11px; color: #dc2626; font-weight: 500;">Complete your order now!</div>
    </div>
  </div>',
  'High-urgency checkout notification with CTA',
  'visitors_pulse',
  '["count", "page_name", "page_url"]',
  '{"count": 6, "page_name": "Checkout", "page_url": "/checkout", "location": ""}',
  true
);