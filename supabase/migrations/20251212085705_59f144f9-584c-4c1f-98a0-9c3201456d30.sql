-- Clean up duplicate instant_capture entries (keep form_hook as canonical)
DELETE FROM integrations 
WHERE provider = 'instant_capture';