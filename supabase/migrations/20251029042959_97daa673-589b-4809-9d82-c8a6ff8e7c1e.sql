-- Phase 2: Add admin RLS policies for comprehensive access

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all websites" ON public.websites;
DROP POLICY IF EXISTS "Admins can view all integration connectors" ON public.integration_connectors;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;

-- Websites: Allow admins to view all
CREATE POLICY "Admins can view all websites"
ON public.websites FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Integration Connectors: Allow admins to view all
CREATE POLICY "Admins can view all integration connectors"
ON public.integration_connectors FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Events: Allow admins to view all
CREATE POLICY "Admins can view all events"
ON public.events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Phase 3: Add Free plan to subscription_plans (using a conditional insert)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Free') THEN
    INSERT INTO public.subscription_plans (
      name, 
      price_monthly, 
      price_yearly,
      max_websites,
      max_events_per_month,
      features,
      is_active
    ) VALUES (
      'Free',
      0,
      0,
      1,
      1000,
      '["1 Website", "1,000 monthly views", "Basic analytics", "Community support"]'::jsonb,
      true
    );
  END IF;
END $$;