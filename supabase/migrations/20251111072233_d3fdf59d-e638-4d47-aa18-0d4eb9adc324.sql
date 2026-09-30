-- Manually insert announcement event to make it appear immediately
INSERT INTO events (
  widget_id,
  website_id,
  event_type,
  source,
  message_template,
  event_data,
  status,
  moderation_status,
  created_at
) VALUES (
  '9013e229-bafd-4319-b02d-d7829a35c028',
  'f16ca120-6184-49af-a3ec-6761d482fecc',
  'announcement',
  'manual',
  'Push Notification is Now Live!',
  '{"title": "Feature Release", "message": "Push Notification is Now Live!", "cta_text": "Want to see how it works? Click here", "cta_url": "https://notiproof.com", "icon": "📢"}'::jsonb,
  'approved',
  'approved',
  NOW()
);