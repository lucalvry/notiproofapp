-- Step 1: Move all Free plan users to Starter plan with 14-day trial
UPDATE user_subscriptions
SET 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'Starter' LIMIT 1),
  status = 'trialing',
  trial_start = NOW(),
  trial_end = NOW() + INTERVAL '14 days',
  updated_at = NOW()
WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'Free');

-- Step 2: Delete the Free plan forever
DELETE FROM subscription_plans WHERE name = 'Free';

-- Step 3: Set default status for new subscriptions
ALTER TABLE user_subscriptions ALTER COLUMN status SET DEFAULT 'trialing';