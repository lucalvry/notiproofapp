-- Phase 2: Remove duplicate icons from live_visitors templates
-- Icons should only come from the widget wrapper (media section), not from inside templates

-- 1. Checkout Urgency - remove urgency-icon div
UPDATE templates
SET html_template = '<div class="visitors-notification checkout-urgency">
    <div class="urgency-message">
      <strong>{{template.visitor_count}}</strong> people are checking out on 
      <a href="{{template.page_url}}" style="color: inherit; font-size: inherit; text-decoration: underline; font-weight: 600;">{{template.page_name}}</a>
      <div class="cta" style="font-size: 0.85em; color: inherit; font-weight: 500; opacity: 0.9;">Complete your order now!</div>
    </div>
  </div>',
    updated_at = now()
WHERE template_key = 'live_visitors_checkout_urgency';

-- 2. Compact Badge - remove visitors-icon span
UPDATE templates
SET html_template = '<div class="visitors-notification compact">
      <span class="visitors-text">{{template.visitor_count}} {{message}}</span>
    </div>',
    updated_at = now()
WHERE template_key = 'visitors_compact_badge';

-- 3. Live Counter - remove pulse-dot div
UPDATE templates
SET html_template = '<div class="visitors-notification animated">
      <div class="visitors-content">
        <div class="visitors-count"><strong>{{template.visitor_count}}</strong> {{message}}</div>
        {{#location}}<div class="visitors-meta">{{template.location}}</div>{{/location}}
      </div>
    </div>',
    updated_at = now()
WHERE template_key = 'visitors_live_counter';

-- 4. Live Visitors - Compact - remove notification-icon div
UPDATE templates
SET html_template = '<div class="notification-compact">
  <div class="notification-content">
    <p><strong>{{template.visitor_count}}</strong> people {{#template.location}}from {{template.location}}{{/template.location}} are viewing this page</p>
  </div>
</div>',
    updated_at = now()
WHERE template_key = 'live_visitors_v1';

-- 5. Location Rich - remove visitors-icon globe div
UPDATE templates
SET html_template = '<div class="visitors-notification detailed">
      <div class="visitors-content">
        <div class="visitors-count">{{template.visitor_count}} {{message}}</div>
        <div class="visitors-locations">{{location_list}}</div>
      </div>
    </div>',
    updated_at = now()
WHERE template_key = 'visitors_location_rich';

-- 6. Page Viewer with Link - remove visitors-icon div
UPDATE templates
SET html_template = '<div class="visitors-notification page-viewer">
    <div class="visitors-content">
      <div class="visitors-count">
        <strong>{{template.visitor_count}}</strong> people are viewing 
        <a href="{{template.page_url}}" style="color: inherit; font-size: inherit; text-decoration: underline;">{{template.page_name}}</a>
      </div>
      {{#location}}<div class="visitors-meta">from {{template.location}}</div>{{/location}}
    </div>
  </div>',
    updated_at = now()
WHERE template_key = 'live_visitors_page_link';

-- 7. Popular Page Alert - remove activity-badge div
UPDATE templates
SET html_template = '<div class="visitors-notification dynamic-activity">
    <div class="message">
      <strong>{{template.visitor_count}}</strong> visitors on 
      <a href="{{template.page_url}}" style="color: inherit; font-size: inherit; text-decoration: underline; font-weight: 600;">{{template.page_name}}</a>
      {{#location}}<span class="from" style="font-size: 0.85em; opacity: 0.7;"> from {{template.location}}</span>{{/location}}
    </div>
  </div>',
    updated_at = now()
WHERE template_key = 'live_visitors_popular_page';

-- 8. Product Interest Alert - remove icon-circle div
UPDATE templates
SET html_template = '<div class="visitors-notification product-interest">
    <div class="content">
      <span class="highlight">{{template.visitor_count}}</span> customers interested in 
      <a href="{{template.page_url}}" class="page-link" style="color: inherit; font-size: inherit; text-decoration: underline;">{{template.page_name}}</a>
      <div class="sub-text" style="font-size: 0.85em; opacity: 0.9;">Don''t miss out!</div>
    </div>
  </div>',
    updated_at = now()
WHERE template_key = 'live_visitors_product_interest';

-- 9. Shop Activity Pulse - remove pulse-indicator div
UPDATE templates
SET html_template = '<div class="visitors-notification shop-pulse">
    <div class="visitors-content">
      <strong>{{template.visitor_count}}</strong> shoppers browsing 
      <a href="{{template.page_url}}" style="color: inherit; font-size: inherit; font-weight: 600; text-decoration: underline;">the {{template.page_name}} page</a> right now!
      {{#location}}<div class="visitors-location">📍 {{template.location}}</div>{{/location}}
    </div>
  </div>',
    updated_at = now()
WHERE template_key = 'live_visitors_shop_pulse';

-- 10. Social Proof - remove visitors-icon div
UPDATE templates
SET html_template = '<div class="visitors-notification social-proof">
      <div class="visitors-content">
        <div class="visitors-count">{{template.visitor_count}} {{message}}</div>
        {{#location}}<div class="visitors-meta">from {{template.location}}</div>{{/location}}
      </div>
    </div>',
    updated_at = now()
WHERE template_key = 'visitors_social_proof';

-- 11. Urgency Banner - remove urgency-icon span
UPDATE templates
SET html_template = '<div class="visitors-notification urgency">
      <span class="visitors-text"><strong>{{template.visitor_count}}</strong> {{message}}</span>
    </div>',
    updated_at = now()
WHERE template_key = 'visitors_urgency_banner';