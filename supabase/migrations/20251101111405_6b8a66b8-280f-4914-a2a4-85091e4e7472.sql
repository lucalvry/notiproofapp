-- Fix remaining RLS policies that use app_role casting
-- This migration updates all remaining policies to use the text-based has_role overload

-- Update heatmap_clicks policy
DROP POLICY IF EXISTS "Admins can view all heatmap data" ON public.heatmap_clicks;
CREATE POLICY "Admins can view all heatmap data"
ON public.heatmap_clicks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Update onboarding_analytics view to use text comparison
DROP VIEW IF EXISTS public.onboarding_analytics;
CREATE OR REPLACE VIEW public.onboarding_analytics AS
SELECT 
  p.id as user_id,
  p.created_at as signup_date,
  p.business_type,
  p.onboarding_progress,
  (p.onboarding_progress->>'completion_percentage')::int as completion_percentage,
  (SELECT COUNT(*) FROM websites w WHERE w.user_id = p.id) as websites_count,
  (SELECT COUNT(*) FROM campaigns c WHERE c.user_id = p.id) as campaigns_count,
  (SELECT COUNT(*) FROM widgets wg WHERE wg.user_id = p.id) as widgets_count,
  CASE 
    WHEN (p.onboarding_progress->>'completion_percentage')::int >= 100 THEN 'completed'
    WHEN (p.onboarding_progress->>'completion_percentage')::int >= 50 THEN 'in_progress'
    ELSE 'not_started'
  END as onboarding_status
FROM profiles p
WHERE p.role::text = 'user';