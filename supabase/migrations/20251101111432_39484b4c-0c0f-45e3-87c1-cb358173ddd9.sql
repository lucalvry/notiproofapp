-- Fix onboarding_analytics view to return aggregate data as expected by the admin UI
DROP VIEW IF EXISTS public.onboarding_analytics;

CREATE OR REPLACE VIEW public.onboarding_analytics AS
WITH user_stats AS (
  SELECT 
    p.id,
    (p.onboarding_progress->>'completion_percentage')::int as completion_percentage,
    (p.onboarding_progress->>'websites_added')::boolean as websites_added,
    (p.onboarding_progress->>'campaigns_created')::boolean as campaigns_created,
    (p.onboarding_progress->>'widget_installed')::boolean as widget_installed,
    (p.onboarding_progress->>'first_conversion')::boolean as first_conversion,
    CASE 
      WHEN (p.onboarding_progress->>'completion_percentage')::int >= 100 THEN 'completed'
      WHEN (p.onboarding_progress->>'completion_percentage')::int >= 50 THEN 'in_progress'
      ELSE 'not_started'
    END as status
  FROM profiles p
  WHERE p.role::text = 'user'
)
SELECT 
  COUNT(*) FILTER (WHERE status = 'not_started') as users_not_started,
  COUNT(*) FILTER (WHERE status = 'in_progress') as users_in_progress,
  COUNT(*) FILTER (WHERE status = 'completed') as users_completed,
  COUNT(*) FILTER (WHERE completion_percentage > 0 AND NOT websites_added) as stuck_at_website,
  COUNT(*) FILTER (WHERE websites_added AND NOT campaigns_created) as stuck_at_campaign,
  COUNT(*) FILTER (WHERE campaigns_created AND NOT widget_installed) as stuck_at_installation,
  COUNT(*) FILTER (WHERE widget_installed AND NOT first_conversion) as stuck_at_conversion,
  COALESCE(AVG(completion_percentage), 0)::int as average_completion
FROM user_stats;