-- Phase 1: Add WooCommerce-specific templates to the templates table

-- Template 1: Compact purchase notification (default)
INSERT INTO templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  html_template,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'woocommerce',
  'woocommerce_purchase_v1',
  'WooCommerce Purchase - Compact',
  'Compact social proof notification for WooCommerce purchases',
  'compact',
  'purchase',
  '<div class="noti-card" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 340px;">
  {{#template.product_image}}
  <img src="{{template.product_image}}" alt="" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover; flex-shrink: 0;" />
  {{/template.product_image}}
  {{^template.product_image}}
  <div style="width: 48px; height: 48px; border-radius: 6px; background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
    <span style="font-size: 20px;">🛒</span>
  </div>
  {{/template.product_image}}
  <div style="flex: 1; min-width: 0;">
    <div style="font-weight: 600; font-size: 13px; color: #1f2937; margin-bottom: 2px;">{{template.customer_name}}</div>
    <div style="font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">purchased <strong style="color: #1f2937;">{{template.product_name}}</strong></div>
    <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">{{template.customer_location}} • {{template.time_ago}}</div>
  </div>
</div>',
  '["template.customer_name", "template.product_name", "template.time_ago"]',
  '{"template.customer_name": "Jane Smith", "template.customer_location": "Lagos, Nigeria", "template.product_name": "Premium Sneakers", "template.product_image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100", "template.time_ago": "5 minutes ago", "template.order_total": "₦45,000"}',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  updated_at = now();

-- Template 2: Card-style with product image (featured)
INSERT INTO templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  html_template,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'woocommerce',
  'woocommerce_purchase_v2',
  'WooCommerce Purchase - Card',
  'Card-style notification with prominent product image',
  'card',
  'purchase',
  '<div class="noti-card" style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 320px; overflow: hidden;">
  {{#template.product_image}}
  <div style="position: relative; height: 120px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);">
    <img src="{{template.product_image}}" alt="" style="width: 100%; height: 100%; object-fit: cover;" />
    <div style="position: absolute; top: 8px; right: 8px; background: #10b981; color: white; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px;">JUST SOLD</div>
  </div>
  {{/template.product_image}}
  <div style="padding: 12px 16px;">
    <div style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 4px;">{{template.product_name}}</div>
    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">{{template.customer_name}} from {{template.customer_location}}</div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 700; font-size: 16px; color: #7c3aed;">{{template.order_total}}</span>
      <span style="font-size: 11px; color: #9ca3af;">{{template.time_ago}}</span>
    </div>
  </div>
</div>',
  '["template.customer_name", "template.product_name", "template.order_total", "template.time_ago"]',
  '{"template.customer_name": "Michael Brown", "template.customer_location": "Abuja, Nigeria", "template.product_name": "Designer Watch", "template.product_image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", "template.time_ago": "2 minutes ago", "template.order_total": "₦120,000"}',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  updated_at = now();

-- Template 3: Minimal text version
INSERT INTO templates (
  provider,
  template_key,
  name,
  description,
  style_variant,
  category,
  html_template,
  required_fields,
  preview_json,
  is_active
) VALUES (
  'woocommerce',
  'woocommerce_purchase_compact',
  'WooCommerce Purchase - Minimal',
  'Minimal text-only notification for clean sites',
  'minimal',
  'purchase',
  '<div class="noti-card" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: white; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 300px; border-left: 3px solid #10b981;">
  <span style="font-size: 18px;">🛍️</span>
  <div style="flex: 1;">
    <div style="font-size: 13px; color: #374151;"><strong>{{template.customer_name}}</strong> just purchased <strong>{{template.product_name}}</strong></div>
    <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">{{template.time_ago}}</div>
  </div>
</div>',
  '["template.customer_name", "template.product_name", "template.time_ago"]',
  '{"template.customer_name": "Sarah", "template.product_name": "Wireless Earbuds", "template.time_ago": "just now"}',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  html_template = EXCLUDED.html_template,
  preview_json = EXCLUDED.preview_json,
  updated_at = now();