-- Sprint 1: Add settings columns to website_settings table
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS initial_delay INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_duration INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS interval INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'bottom-left',
  ADD COLUMN IF NOT EXISTS mobile_position_override TEXT DEFAULT 'bottom-center',
  ADD COLUMN IF NOT EXISTS animation TEXT DEFAULT 'slide',
  ADD COLUMN IF NOT EXISTS max_per_page INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_per_session INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS pause_after_click BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pause_after_close BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS make_clickable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS debug_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_team_ips BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_rules JSONB DEFAULT '{
    "url_rules": {"include_urls": [], "exclude_urls": []},
    "countries": {"include": [], "exclude": []},
    "devices": ["desktop", "mobile", "tablet"],
    "behavior": {"new_visitors": false, "returning_visitors": false},
    "schedule": {"enabled": false, "timezone": "UTC", "days": [], "hours": {"start": "00:00", "end": "23:59"}}
  }'::jsonb;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_website_settings_website_id ON public.website_settings(website_id);