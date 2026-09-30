-- Fix form_capture events - route to form capture campaign's widget
UPDATE events e
SET widget_id = w.id
FROM campaigns c
JOIN widgets w ON w.campaign_id = c.id
WHERE e.event_type = 'form_capture'
AND e.website_id = c.website_id
AND c.data_sources::text LIKE '%form_hook%';

-- Fix testimonial events - route to testimonial campaign's widget  
UPDATE events e
SET widget_id = w.id
FROM campaigns c
JOIN widgets w ON w.campaign_id = c.id
WHERE e.event_type = 'testimonial'
AND e.website_id = c.website_id
AND c.data_sources::text LIKE '%testimonials%';