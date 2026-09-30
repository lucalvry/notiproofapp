-- Insert form capture templates into the templates table
INSERT INTO public.templates (name, provider, category, style_variant, template_key, html_template, required_fields, preview_json, description, is_active)
VALUES
-- Newsletter Signup
(
  'Newsletter Signup',
  'form_hook',
  'form_capture',
  'modern',
  'form_hook_newsletter',
  '<div class="notification-card"><div class="avatar">{{avatar}}</div><div class="content"><strong>{{name}}</strong> just subscribed to our newsletter! 📧</div></div>',
  '["name"]',
  '{"name": "Sarah", "email": "sarah@example.com", "avatar": "📧"}',
  'Perfect for newsletter signup forms. Shows when visitors subscribe.',
  true
),
-- Registration/Signup
(
  'Registration Signup',
  'form_hook',
  'form_capture',
  'modern',
  'form_hook_registration',
  '<div class="notification-card"><div class="avatar">{{avatar}}</div><div class="content"><strong>{{name}}</strong> from {{location}} just signed up! 🎉</div></div>',
  '["name"]',
  '{"name": "John", "email": "john@example.com", "location": "New York", "avatar": "🎉"}',
  'Great for registration and signup forms. Celebrates new user signups.',
  true
),
-- Book Demo
(
  'Book Demo',
  'form_hook',
  'form_capture',
  'modern',
  'form_hook_demo',
  '<div class="notification-card"><div class="avatar">{{avatar}}</div><div class="content"><strong>{{name}}</strong> from {{company}} just booked a demo! 📅</div></div>',
  '["name"]',
  '{"name": "Emily", "company": "Acme Inc", "email": "emily@acme.com", "avatar": "📅"}',
  'Ideal for demo booking forms. Shows social proof of demo requests.',
  true
),
-- Contact Form
(
  'Contact Form',
  'form_hook',
  'form_capture',
  'modern',
  'form_hook_contact',
  '<div class="notification-card"><div class="avatar">{{avatar}}</div><div class="content"><strong>{{name}}</strong> just reached out to us 💬</div></div>',
  '["name"]',
  '{"name": "Michael", "email": "michael@company.com", "message": "Hello!", "avatar": "💬"}',
  'For general contact forms. Shows visitor engagement.',
  true
),
-- Request Proposal (RFP)
(
  'Request Proposal',
  'form_hook',
  'form_capture',
  'modern',
  'form_hook_rfp',
  '<div class="notification-card"><div class="avatar">{{avatar}}</div><div class="content"><strong>{{name}}</strong> from {{company}} requested a proposal! 📋</div></div>',
  '["name"]',
  '{"name": "Lisa", "company": "Tech Corp", "email": "lisa@techcorp.com", "avatar": "📋"}',
  'For RFP and proposal request forms. Great for B2B sites.',
  true
),
-- Checkout/Order
(
  'Checkout Order',
  'form_hook',
  'form_capture',
  'modern',
  'form_hook_checkout',
  '<div class="notification-card"><div class="avatar">{{avatar}}</div><div class="content"><strong>{{name}}</strong> from {{location}} just placed an order! 🛒</div></div>',
  '["name"]',
  '{"name": "Alex", "location": "Los Angeles", "product": "Premium Plan", "avatar": "🛒"}',
  'For checkout and order forms. Shows purchase activity.',
  true
),
-- Generic Form
(
  'Generic Form',
  'form_hook',
  'form_capture',
  'modern',
  'form_hook_generic',
  '<div class="notification-card"><div class="avatar">{{avatar}}</div><div class="content"><strong>{{name}}</strong> just submitted a form ✅</div></div>',
  '["name"]',
  '{"name": "User", "email": "user@example.com", "avatar": "✅"}',
  'Generic template for any form type. Simple and versatile.',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  html_template = EXCLUDED.html_template,
  required_fields = EXCLUDED.required_fields,
  preview_json = EXCLUDED.preview_json,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;