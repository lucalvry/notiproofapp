-- PHASE 5: Cleanup Demo Events
-- Delete demo events that were cluttering the database
DELETE FROM events 
WHERE widget_id = '9013e229-bafd-4319-b02d-d7829a35c028' 
AND source = 'demo';