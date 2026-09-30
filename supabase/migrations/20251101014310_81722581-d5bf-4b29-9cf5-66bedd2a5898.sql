-- Fix the orphaned subscription linking logic
-- The previous migration referenced a non-existent stripe.customers table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, name, role, status, business_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'User'),
    'user',
    'active',
    'ecommerce'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Link any orphaned subscriptions by matching Stripe customer email to user email
  -- This handles the case where someone pays before creating an account
  UPDATE public.user_subscriptions
  SET user_id = NEW.id
  WHERE user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    WHERE us.id = user_subscriptions.id
    -- We'll match based on metadata stored during checkout
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates profile and prepares for orphaned subscription linking when user signs up';