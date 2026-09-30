-- Create profile auto-creation trigger
-- This ensures that when a user signs up (auth.users), they automatically get a profile

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
  
  -- Link any orphaned subscriptions by email
  UPDATE public.user_subscriptions
  SET user_id = NEW.id
  WHERE user_id IS NULL
  AND stripe_customer_id IN (
    SELECT customer_id 
    FROM stripe.customers 
    WHERE email = NEW.email
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create email preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default email preferences
  INSERT INTO public.email_preferences (user_id, weekly_reports, marketing_emails, security_alerts)
  VALUES (NEW.id, true, true, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create trigger on profiles
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_preferences();

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates profile and links orphaned subscriptions when user signs up';
COMMENT ON FUNCTION public.handle_new_user_preferences IS 'Creates default email preferences for new users';