-- Add Stripe Price ID columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Create indexes for faster Stripe lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_monthly 
ON public.subscription_plans(stripe_price_id_monthly);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_yearly 
ON public.subscription_plans(stripe_price_id_yearly);

-- Update existing plans with Stripe Price IDs
UPDATE public.subscription_plans SET 
  stripe_price_id_monthly = 'price_1SNS5bA2FPTkZA9ScR6NvC51',
  stripe_price_id_yearly = 'price_1SNS8gA2FPTkZA9SXmFTY0bG'
WHERE name = 'Starter';

UPDATE public.subscription_plans SET 
  stripe_price_id_monthly = 'price_1SNSB2A2FPTkZA9S2zSnRT4F',
  stripe_price_id_yearly = 'price_1SNSCOA2FPTkZA9SFBhp4peP'
WHERE name = 'Standard';

UPDATE public.subscription_plans SET 
  stripe_price_id_monthly = 'price_1SNS9QA2FPTkZA9SuDGsNY9T',
  stripe_price_id_yearly = 'price_1SNS9yA2FPTkZA9SIt8Ji6nZ'
WHERE name = 'Pro';

UPDATE public.subscription_plans SET 
  stripe_price_id_monthly = 'price_1SNT2jA2FPTkZA9SjpjSCkGb',
  stripe_price_id_yearly = 'price_1SNT4WA2FPTkZA9SEPDKsZIR'
WHERE name = 'Business';

-- Enterprise plan will have NULL stripe_price_ids (Contact Sales)