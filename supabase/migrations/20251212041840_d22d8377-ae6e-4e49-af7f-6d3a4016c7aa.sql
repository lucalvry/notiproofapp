-- Update onboarding_progress JSONB field with new fields for path-based onboarding

-- Update existing profiles to include new onboarding fields
UPDATE public.profiles
SET onboarding_progress = COALESCE(onboarding_progress, '{}'::jsonb) || jsonb_build_object(
  'selected_path', null,
  'testimonial_form_created', false,
  'first_testimonial_collected', false,
  'integration_connected', false,
  'playlist_created', false,
  'template_customized', false,
  'team_member_invited', false,
  'current_step', null,
  'steps_completed', '[]'::jsonb,
  'onboarding_started_at', null,
  'onboarding_completed_at', null,
  'website_added', COALESCE((onboarding_progress->>'websites_added')::boolean, (onboarding_progress->>'website_added')::boolean, false),
  'campaign_created', COALESCE((onboarding_progress->>'campaigns_created')::boolean, (onboarding_progress->>'campaign_created')::boolean, false)
)
WHERE onboarding_progress IS NULL 
   OR onboarding_progress->>'selected_path' IS NULL;

-- Drop existing view and recreate with new columns
DROP VIEW IF EXISTS public.onboarding_analytics;

CREATE VIEW public.onboarding_analytics AS
SELECT 
  p.id as user_id,
  p.created_at as user_created_at,
  p.business_type,
  p.onboarding_progress->>'selected_path' as selected_path,
  (p.onboarding_progress->>'website_added')::boolean as website_added,
  (p.onboarding_progress->>'campaign_created')::boolean as campaign_created,
  (p.onboarding_progress->>'widget_installed')::boolean as widget_installed,
  (p.onboarding_progress->>'first_conversion')::boolean as first_conversion,
  (p.onboarding_progress->>'testimonial_form_created')::boolean as testimonial_form_created,
  (p.onboarding_progress->>'first_testimonial_collected')::boolean as first_testimonial_collected,
  (p.onboarding_progress->>'integration_connected')::boolean as integration_connected,
  (p.onboarding_progress->>'playlist_created')::boolean as playlist_created,
  (p.onboarding_progress->>'template_customized')::boolean as template_customized,
  (p.onboarding_progress->>'team_member_invited')::boolean as team_member_invited,
  (p.onboarding_progress->>'dismissed')::boolean as dismissed,
  (p.onboarding_progress->>'completion_percentage')::integer as completion_percentage,
  p.onboarding_progress->>'onboarding_started_at' as onboarding_started_at,
  p.onboarding_progress->>'onboarding_completed_at' as onboarding_completed_at
FROM public.profiles p;