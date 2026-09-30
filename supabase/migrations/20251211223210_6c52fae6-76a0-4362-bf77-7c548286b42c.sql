-- Recreate onboarding_analytics view with security_invoker
CREATE OR REPLACE VIEW public.onboarding_analytics 
WITH (security_invoker = true)
AS
SELECT 
  COUNT(*) FILTER (WHERE (p.onboarding_progress->>'completion_percentage')::int = 0 OR p.onboarding_progress IS NULL) as users_not_started,
  COUNT(*) FILTER (WHERE (p.onboarding_progress->>'completion_percentage')::int > 0 AND (p.onboarding_progress->>'completion_percentage')::int < 100) as users_in_progress,
  COUNT(*) FILTER (WHERE (p.onboarding_progress->>'completion_percentage')::int = 100) as users_completed,
  COUNT(*) FILTER (WHERE (p.onboarding_progress->>'websites_added')::boolean = false AND (p.onboarding_progress->>'completion_percentage')::int > 0) as stuck_at_website,
  COUNT(*) FILTER (WHERE (p.onboarding_progress->>'websites_added')::boolean = true AND (p.onboarding_progress->>'campaigns_created')::boolean = false) as stuck_at_campaign,
  COUNT(*) FILTER (WHERE (p.onboarding_progress->>'campaigns_created')::boolean = true AND (p.onboarding_progress->>'widget_installed')::boolean = false) as stuck_at_installation,
  COUNT(*) FILTER (WHERE (p.onboarding_progress->>'widget_installed')::boolean = true AND (p.onboarding_progress->>'first_conversion')::boolean = false) as stuck_at_conversion,
  COALESCE(AVG((p.onboarding_progress->>'completion_percentage')::int), 0) as average_completion
FROM public.profiles p;

-- Grant access to admins only
GRANT SELECT ON public.onboarding_analytics TO authenticated;