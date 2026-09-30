-- Create email send log table for rate limiting and monitoring
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  status text NOT NULL,
  error_message text,
  sent_at timestamptz DEFAULT now(),
  retry_after timestamptz,
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_status ON public.email_send_log(status, sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs (for monitoring abuse)
CREATE POLICY "Admins can view email logs"
  ON public.email_send_log
  FOR SELECT
  USING (public.is_admin(auth.uid()));