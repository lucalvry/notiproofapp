-- Fix security definer view issue by making it SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.onboarding_analytics;

CREATE VIEW public.onboarding_analytics 
WITH (security_invoker = true)
AS
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