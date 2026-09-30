-- Activate the Free plan and assign it to existing users
DO $$
DECLARE
  free_plan_id uuid;
  assigned_count integer := 0;
BEGIN
  -- Get and activate Free plan
  UPDATE public.subscription_plans 
  SET is_active = true 
  WHERE name = 'Free' 
  RETURNING id INTO free_plan_id;
  
  IF free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Free plan not found in subscription_plans table';
  END IF;
  
  RAISE NOTICE 'Activated Free plan with ID: %', free_plan_id;
  
  -- Create subscriptions for users without one
  WITH inserted AS (
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_start)
    SELECT 
      au.id,
      free_plan_id,
      'active',
      NOW()
    FROM auth.users au
    LEFT JOIN public.user_subscriptions us ON au.id = us.user_id
    WHERE us.id IS NULL
    RETURNING user_id
  )
  SELECT COUNT(*) INTO assigned_count FROM inserted;
  
  RAISE NOTICE 'Assigned Free plan to % existing users', assigned_count;
END $$;