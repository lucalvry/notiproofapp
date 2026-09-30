-- Create admin_email_templates table for managing email templates
CREATE TABLE public.admin_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_preview TEXT,
  placeholders JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can view email templates" ON public.admin_email_templates
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert email templates" ON public.admin_email_templates
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update email templates" ON public.admin_email_templates
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete email templates" ON public.admin_email_templates
  FOR DELETE USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_admin_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_admin_email_templates_updated_at
  BEFORE UPDATE ON public.admin_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_email_templates_updated_at();

-- Insert default templates
INSERT INTO public.admin_email_templates (template_key, name, description, subject, body_html, placeholders) VALUES
  ('trial_3_days', '3 Days Before Trial Expires', 'Sent automatically when a user''s trial has 3 days remaining', 
   '⏰ Your {{planName}} trial ends in 3 days - Don''t lose access!', 
   '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your trial ends in 3 days</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">NotiProof</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 0;">
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400E;">Your trial ends in 3 days</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">You''ve been making great progress with NotiProof! Your {{planName}} trial will expire in 3 days. Upgrade now to keep your social proof notifications running and continue converting visitors into customers.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://app.notiproof.com/settings/billing" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">Upgrade Now</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">Questions? Reply to this email or visit our <a href="https://app.notiproof.com/help" style="color: #4F46E5;">help center</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
   '[{"key": "name", "description": "User''s name"}, {"key": "planName", "description": "Subscription plan name"}, {"key": "daysRemaining", "description": "Days until trial expires"}]'::jsonb),

  ('trial_1_day', '1 Day Before Trial Expires', 'Sent automatically when a user''s trial has 1 day remaining', 
   '🚨 Last chance! Your {{planName}} trial expires tomorrow', 
   '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Last day of your trial</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">NotiProof</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 0;">
              <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 16px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #991B1B;">Last day of your trial!</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">This is your last chance! Your {{planName}} trial expires tomorrow. Don''t let your hard work go to waste - upgrade now to maintain your conversion momentum.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://app.notiproof.com/settings/billing" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">Upgrade Now</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">Questions? Reply to this email or visit our <a href="https://app.notiproof.com/help" style="color: #4F46E5;">help center</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
   '[{"key": "name", "description": "User''s name"}, {"key": "planName", "description": "Subscription plan name"}, {"key": "daysRemaining", "description": "Days until trial expires"}]'::jsonb),

  ('trial_expired', 'Trial Expired', 'Sent automatically when a user''s trial has expired', 
   'Your {{planName}} trial has ended - Upgrade to continue', 
   '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your trial has ended</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">NotiProof</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 0;">
              <div style="background-color: #F3F4F6; border-left: 4px solid #6B7280; padding: 16px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #374151;">Your trial has ended</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">Your {{planName}} trial has ended. Your social proof notifications are now paused. Upgrade today to reactivate them and get back to converting more visitors!</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://app.notiproof.com/settings/billing" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">Reactivate Now</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">Questions? Reply to this email or visit our <a href="https://app.notiproof.com/help" style="color: #4F46E5;">help center</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
   '[{"key": "name", "description": "User''s name"}, {"key": "planName", "description": "Subscription plan name"}, {"key": "daysRemaining", "description": "Days until trial expires"}]'::jsonb);