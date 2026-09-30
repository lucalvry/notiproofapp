-- Update templates: rename instant_capture to form_hook
UPDATE templates 
SET provider = 'form_hook'
WHERE provider = 'instant_capture';

-- Also update template_key to reflect new naming
UPDATE templates 
SET template_key = REPLACE(template_key, 'instant_capture', 'form_hook')
WHERE template_key LIKE '%instant_capture%';