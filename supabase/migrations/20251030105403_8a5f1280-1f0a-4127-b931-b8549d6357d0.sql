-- Deactivate Free plan to prevent backdoor access
UPDATE subscription_plans 
SET is_active = false 
WHERE name = 'Free';

-- Add comment for clarity
COMMENT ON TABLE subscription_plans IS 'All users must go through paid trial - Free plan is deactivated';