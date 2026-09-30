-- Extend all expired trials by 30 days from now
UPDATE user_subscriptions 
SET trial_end = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE status = 'trialing' 
  AND trial_end < NOW();