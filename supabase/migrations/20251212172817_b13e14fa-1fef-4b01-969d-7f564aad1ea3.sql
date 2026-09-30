-- Create table to track trial email notifications sent (prevents duplicates)
CREATE TABLE public.trial_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('trial_3_days', 'trial_1_day', 'trial_expired')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscription_id, email_type)
);

-- Add index for faster lookups
CREATE INDEX idx_trial_email_notifications_user_id ON public.trial_email_notifications(user_id);
CREATE INDEX idx_trial_email_notifications_subscription_id ON public.trial_email_notifications(subscription_id);

-- Enable RLS
ALTER TABLE public.trial_email_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view trial notifications
CREATE POLICY "Admins can view trial notifications" 
ON public.trial_email_notifications 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can manage trial notifications"
ON public.trial_email_notifications
FOR ALL
USING (true)
WITH CHECK (true);