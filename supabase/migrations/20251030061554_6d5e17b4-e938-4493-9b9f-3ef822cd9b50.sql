-- 1. Drop the INSERT policy that allows client-side subscription creation
DROP POLICY IF EXISTS "Users can create their own subscription" ON public.user_subscriptions;

-- 2. Deactivate Free plan (preserve data for existing users)
UPDATE subscription_plans 
SET is_active = false 
WHERE name = 'Free';

-- 3. Add trial support columns to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS trial_period_days INTEGER DEFAULT 14;

-- 4. Update all paid plans to have 14-day trials
UPDATE subscription_plans 
SET trial_period_days = 14 
WHERE name IN ('Starter', 'Standard', 'Pro', 'Business');

-- 5. Add trial tracking to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- 6. Create table to track trial eligibility (prevent multiple trials)
CREATE TABLE IF NOT EXISTS user_trial_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ended_at TIMESTAMPTZ,
  subscription_id UUID REFERENCES user_subscriptions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 7. Enable RLS on trial history
ALTER TABLE user_trial_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trial history"
ON user_trial_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 8. Create index for faster trial eligibility checks
CREATE INDEX IF NOT EXISTS idx_user_trial_history_user_id ON user_trial_history(user_id);