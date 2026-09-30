-- Fix live_visitors template placeholders to use template.* prefix
UPDATE templates 
SET html_template = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(html_template, '{{count}}', '{{template.visitor_count}}'),
      '{{page_name}}', '{{template.page_name}}'
    ),
    '{{page_url}}', '{{template.page_url}}'
  ),
  '{{location}}', '{{template.location}}'
),
required_fields = '["template.visitor_count", "template.page_name", "template.page_url"]'::jsonb
WHERE provider = 'live_visitors' AND html_template LIKE '%{{count}}%';

-- Also fix any templates that use {{visitors}} instead of {{count}}
UPDATE templates 
SET html_template = REPLACE(html_template, '{{visitors}}', '{{template.visitor_count}}')
WHERE provider = 'live_visitors' AND html_template LIKE '%{{visitors}}%';