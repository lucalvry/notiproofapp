-- Clean up old Free plan subscriptions without Stripe data
-- These are remnants from before payment-first flow was implemented

UPDATE user_subscriptions
SET status = 'cancelled'
WHERE stripe_subscription_id IS NULL
  AND stripe_customer_id IS NULL
  AND plan_id IN (
    SELECT id FROM subscription_plans WHERE name = 'Free'
  );