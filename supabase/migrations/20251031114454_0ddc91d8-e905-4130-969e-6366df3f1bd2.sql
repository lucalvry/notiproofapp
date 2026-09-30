-- Add onboarding progress tracking to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT jsonb_build_object(
  'step_completed', 0,
  'dismissed', false,
  'last_seen', now(),
  'websites_added', false,
  'campaigns_created', false,
  'widget_installed', false,
  'first_conversion', false,
  'completion_percentage', 0
);

-- Create index for faster queries on onboarding progress
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_progress ON public.profiles USING GIN (onboarding_progress);

-- Create function to calculate onboarding completion percentage
CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  progress_data jsonb;
  completed_count integer := 0;
  total_steps integer := 4;
BEGIN
  SELECT onboarding_progress INTO progress_data
  FROM profiles
  WHERE id = _user_id;
  
  IF progress_data IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count completed milestones
  IF (progress_data->>'websites_added')::boolean THEN
    completed_count := completed_count + 1;
  END IF;
  
  IF (progress_data->>'campaigns_created')::boolean THEN
    completed_count := completed_count + 1;
  END IF;
  
  IF (progress_data->>'widget_installed')::boolean THEN
    completed_count := completed_count + 1;
  END IF;
  
  IF (progress_data->>'first_conversion')::boolean THEN
    completed_count := completed_count + 1;
  END IF;
  
  RETURN (completed_count * 100) / total_steps;
END;
$$;

-- Create function to update onboarding milestone
CREATE OR REPLACE FUNCTION public.update_onboarding_milestone(_user_id uuid, _milestone text, _completed boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_progress jsonb;
  completion_pct integer;
BEGIN
  -- Get current progress
  SELECT onboarding_progress INTO new_progress
  FROM profiles
  WHERE id = _user_id;
  
  -- Initialize if null
  IF new_progress IS NULL THEN
    new_progress := jsonb_build_object(
      'step_completed', 0,
      'dismissed', false,
      'last_seen', now(),
      'websites_added', false,
      'campaigns_created', false,
      'widget_installed', false,
      'first_conversion', false,
      'completion_percentage', 0
    );
  END IF;
  
  -- Update milestone
  new_progress := jsonb_set(new_progress, ARRAY[_milestone], to_jsonb(_completed));
  new_progress := jsonb_set(new_progress, ARRAY['last_seen'], to_jsonb(now()));
  
  -- Calculate completion percentage
  completion_pct := calculate_onboarding_progress(_user_id);
  new_progress := jsonb_set(new_progress, ARRAY['completion_percentage'], to_jsonb(completion_pct));
  
  -- Update profile
  UPDATE profiles
  SET onboarding_progress = new_progress
  WHERE id = _user_id;
END;
$$;

-- Create view for admin onboarding analytics
CREATE OR REPLACE VIEW public.onboarding_analytics AS
SELECT 
  COUNT(*) FILTER (WHERE (onboarding_progress->>'completion_percentage')::integer = 0) as users_not_started,
  COUNT(*) FILTER (WHERE (onboarding_progress->>'completion_percentage')::integer > 0 AND (onboarding_progress->>'completion_percentage')::integer < 100) as users_in_progress,
  COUNT(*) FILTER (WHERE (onboarding_progress->>'completion_percentage')::integer = 100) as users_completed,
  COUNT(*) FILTER (WHERE (onboarding_progress->>'websites_added')::boolean = false) as stuck_at_website,
  COUNT(*) FILTER (WHERE (onboarding_progress->>'websites_added')::boolean = true AND (onboarding_progress->>'campaigns_created')::boolean = false) as stuck_at_campaign,
  COUNT(*) FILTER (WHERE (onboarding_progress->>'campaigns_created')::boolean = true AND (onboarding_progress->>'widget_installed')::boolean = false) as stuck_at_installation,
  COUNT(*) FILTER (WHERE (onboarding_progress->>'widget_installed')::boolean = true AND (onboarding_progress->>'first_conversion')::boolean = false) as stuck_at_conversion,
  ROUND(AVG((onboarding_progress->>'completion_percentage')::integer), 2) as average_completion
FROM profiles
WHERE role = 'user';