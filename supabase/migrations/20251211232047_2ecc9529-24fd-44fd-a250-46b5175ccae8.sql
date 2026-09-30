-- Update the onboarding_progress JSONB structure in profiles table
-- to include all new fields for comprehensive onboarding tracking

-- Update existing onboarding_progress to include new fields (merge with existing data)
UPDATE public.profiles 
SET onboarding_progress = COALESCE(onboarding_progress, '{}'::jsonb) || jsonb_build_object(
  'selected_path', COALESCE(onboarding_progress->>'selected_path', null),
  'testimonial_form_created', COALESCE((onboarding_progress->>'testimonial_form_created')::boolean, false),
  'first_testimonial_collected', COALESCE((onboarding_progress->>'first_testimonial_collected')::boolean, false),
  'integration_connected', COALESCE((onboarding_progress->>'integration_connected')::boolean, false),
  'playlist_created', COALESCE((onboarding_progress->>'playlist_created')::boolean, false),
  'template_customized', COALESCE((onboarding_progress->>'template_customized')::boolean, false),
  'team_member_invited', COALESCE((onboarding_progress->>'team_member_invited')::boolean, false),
  'current_step', COALESCE(onboarding_progress->>'current_step', 'welcome'),
  'steps_completed', COALESCE(onboarding_progress->'steps_completed', '[]'::jsonb),
  'onboarding_started_at', onboarding_progress->>'onboarding_started_at',
  'onboarding_completed_at', onboarding_progress->>'onboarding_completed_at',
  'website_added', COALESCE((onboarding_progress->>'website_added')::boolean, (onboarding_progress->>'websites_added')::boolean, false),
  'campaign_created', COALESCE((onboarding_progress->>'campaign_created')::boolean, (onboarding_progress->>'campaigns_created')::boolean, false)
);