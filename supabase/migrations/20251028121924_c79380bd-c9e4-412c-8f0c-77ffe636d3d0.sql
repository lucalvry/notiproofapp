-- Phase 2: Fix existing widget association and add demo events with proper event_data
-- Update the existing widget to point to the correct website
UPDATE widgets 
SET website_id = 'f489f03d-2e32-4c22-a897-15bee1931dc4'
WHERE id = 'dbd4d5fb-bbb0-4907-a345-712ffebbaad2';

-- Create demo events for the widget with proper event_data
INSERT INTO events (widget_id, event_type, source, status, message_template, user_name, user_location, created_at, views, clicks, event_data)
VALUES 
  ('dbd4d5fb-bbb0-4907-a345-712ffebbaad2', 'signup', 'demo', 'approved', 'Alex K. from San Francisco just signed up!', 'Alex K.', 'San Francisco, CA', NOW() - interval '5 minutes', 0, 0, '{"demo": true}'::jsonb),
  ('dbd4d5fb-bbb0-4907-a345-712ffebbaad2', 'purchase', 'demo', 'approved', 'Maria S. from Austin purchased Premium Plan', 'Maria S.', 'Austin, TX', NOW() - interval '12 minutes', 0, 0, '{"demo": true}'::jsonb),
  ('dbd4d5fb-bbb0-4907-a345-712ffebbaad2', 'conversion', 'demo', 'approved', 'John D. from Seattle gave 5 stars ⭐⭐⭐⭐⭐', 'John D.', 'Seattle, WA', NOW() - interval '20 minutes', 0, 0, '{"demo": true}'::jsonb)
ON CONFLICT DO NOTHING;