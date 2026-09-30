-- Add email analytics tracking columns to trial_email_notifications
ALTER TABLE trial_email_notifications 
ADD COLUMN IF NOT EXISTS tracking_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Create index for tracking lookups
CREATE INDEX IF NOT EXISTS idx_trial_email_notifications_tracking 
ON trial_email_notifications(tracking_id);

-- Create win-back email campaigns table
CREATE TABLE IF NOT EXISTS winback_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('cancelled', 'expired', 'churned')),
  email_sequence INTEGER DEFAULT 1, -- 1 = first email, 2 = second, etc.
  template_key TEXT NOT NULL,
  tracking_id UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'converted', 'unsubscribed', 'failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE winback_email_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admins can manage winback campaigns" ON winback_email_campaigns
  FOR ALL USING (is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_winback_campaigns_user ON winback_email_campaigns(user_id);
CREATE INDEX idx_winback_campaigns_tracking ON winback_email_campaigns(tracking_id);
CREATE INDEX idx_winback_campaigns_status ON winback_email_campaigns(status, campaign_type);

-- Add win-back email templates
INSERT INTO admin_email_templates (template_key, name, description, subject, body_html, placeholders, is_active) VALUES
  ('winback_day_1', 'Win-Back Day 1', 'Sent 1 day after subscription ends', 
   'We miss you, {{name}}! Come back to {{planName}}', 
   '<html><body><h1>We miss you!</h1><p>Hi {{name}},</p><p>We noticed you recently left {{planName}}. We''d love to have you back!</p><p>Use code COMEBACK20 for 20% off your first month back.</p></body></html>',
   '[{"key": "name", "description": "User name"}, {"key": "planName", "description": "Plan name"}, {"key": "discountCode", "description": "Discount code"}]',
   true),
  ('winback_day_3', 'Win-Back Day 3', 'Sent 3 days after subscription ends', 
   '{{name}}, your social proof is waiting...', 
   '<html><body><h1>Your campaigns miss you</h1><p>Hi {{name}},</p><p>Your social proof notifications have been paused. Come back and reactivate them!</p></body></html>',
   '[{"key": "name", "description": "User name"}, {"key": "planName", "description": "Plan name"}]',
   true),
  ('winback_day_7', 'Win-Back Day 7', 'Sent 7 days after subscription ends', 
   'Last chance: Special offer for {{name}}', 
   '<html><body><h1>Special offer just for you</h1><p>Hi {{name}},</p><p>This is our last email. We''re offering you 30% off for 3 months if you come back today.</p><p>Use code COMEBACK30 at checkout.</p></body></html>',
   '[{"key": "name", "description": "User name"}, {"key": "planName", "description": "Plan name"}, {"key": "discountCode", "description": "Discount code"}]',
   true)
ON CONFLICT (template_key) DO NOTHING;