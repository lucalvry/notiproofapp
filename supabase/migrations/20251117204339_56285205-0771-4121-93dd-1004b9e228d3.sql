-- Comprehensive backfill of missing website_id for ALL events
-- This joins events -> widgets to get the correct website_id for any event missing it
UPDATE events e
SET website_id = w.website_id
FROM widgets w
WHERE e.widget_id = w.id
  AND e.website_id IS NULL
  AND w.website_id IS NOT NULL;

-- Add NOT NULL constraint to events.website_id for data integrity
-- This ensures all future events must have a website_id
ALTER TABLE events
ALTER COLUMN website_id SET NOT NULL;