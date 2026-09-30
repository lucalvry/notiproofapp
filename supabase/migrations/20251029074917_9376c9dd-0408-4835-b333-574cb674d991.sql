-- Assign Free plan to all users who don't have a subscription
DO $$
DECLARE
  free_plan_id uuid;
  user_record RECORD;
BEGIN
  -- Get Free plan ID
  SELECT id INTO free_plan_id 
  FROM subscription_plans 
  WHERE name = 'Free' AND is_active = true 
  LIMIT 1;
  
  -- Only proceed if Free plan exists
  IF free_plan_id IS NOT NULL THEN
    -- Loop through users without active subscriptions
    FOR user_record IN 
      SELECT au.id 
      FROM auth.users au
      LEFT JOIN user_subscriptions us ON au.id = us.user_id AND us.status = 'active'
      WHERE us.id IS NULL
    LOOP
      -- Insert Free plan subscription, ignore if already exists
      INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
      VALUES (user_record.id, free_plan_id, 'active', NOW(), NULL)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;