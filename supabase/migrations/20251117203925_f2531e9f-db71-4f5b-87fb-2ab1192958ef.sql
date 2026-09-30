-- Backfill missing website_id for announcement events
-- Join events -> widgets -> campaigns to get the correct website_id
UPDATE events e
SET website_id = w.website_id
FROM widgets w
WHERE e.widget_id = w.id
  AND e.event_type = 'announcement'
  AND e.website_id IS NULL;

-- Add index for better query performance on announcement events
CREATE INDEX IF NOT EXISTS idx_events_announcement_widget
ON events (widget_id, event_type, moderation_status, created_at)
WHERE event_type = 'announcement';