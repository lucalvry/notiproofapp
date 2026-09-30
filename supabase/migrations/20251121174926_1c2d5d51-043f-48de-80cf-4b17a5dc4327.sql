-- Phase 1: Foundation & Data Model for Senja-inspired Testimonial System

-- Form questions table (for custom questions in multi-step forms)
CREATE TABLE IF NOT EXISTS testimonial_form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES testimonial_forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'textarea', 'rating', 'multiple_choice')),
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS testimonial_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  website_id UUID NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('invite', 'thank_you', 'follow_up')),
  template_name TEXT NOT NULL CHECK (template_name IN ('default', 'short', 'friendly', 'formal')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  cta_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email invite tracking
CREATE TABLE IF NOT EXISTS testimonial_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES testimonial_forms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'submitted', 'bounced')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to testimonial_forms
ALTER TABLE testimonial_forms ADD COLUMN IF NOT EXISTS form_type TEXT DEFAULT 'classic' CHECK (form_type IN ('classic', 'saas', 'sponsor', 'course'));
ALTER TABLE testimonial_forms ADD COLUMN IF NOT EXISTS pages_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE testimonial_forms ADD COLUMN IF NOT EXISTS reward_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE testimonial_forms ADD COLUMN IF NOT EXISTS email_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE testimonial_forms ADD COLUMN IF NOT EXISTS negative_feedback_enabled BOOLEAN DEFAULT false;
ALTER TABLE testimonial_forms ADD COLUMN IF NOT EXISTS private_feedback_enabled BOOLEAN DEFAULT false;
ALTER TABLE testimonial_forms ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_testimonial_form_questions_form_id ON testimonial_form_questions(form_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_form_questions_sort_order ON testimonial_form_questions(form_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_testimonial_email_templates_user ON testimonial_email_templates(user_id, template_type);
CREATE INDEX IF NOT EXISTS idx_testimonial_invites_form_id ON testimonial_invites(form_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_invites_email ON testimonial_invites(email);
CREATE INDEX IF NOT EXISTS idx_testimonial_invites_status ON testimonial_invites(status);

-- Insert feature flag for testimonials v2
INSERT INTO feature_flags (name, enabled, description, rollout_percentage, metadata)
VALUES (
  'testimonials_v2_enabled',
  false,
  'Enable Senja-inspired testimonial system with multi-step forms, email campaigns, and advanced features',
  0,
  '{
    "phases": ["foundation", "builder", "collection", "rewards", "emails", "triggers", "moderation", "widget", "navigation", "analytics"],
    "launch_date": null
  }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

-- Seed default email templates
INSERT INTO testimonial_email_templates (user_id, website_id, template_type, template_name, subject, body, cta_text)
VALUES
  -- Default Invite Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'invite',
    'default',
    'We''d love your feedback!',
    'Hi {{name}},

We hope you''re enjoying your experience with us! We''d love to hear your thoughts and feedback.

Your testimonial helps us improve and shows others what makes our product special.

It only takes 2 minutes, and as a thank you, we have a special reward waiting for you!',
    'Share Your Feedback'
  ),
  -- Short Invite Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'invite',
    'short',
    'Quick feedback request',
    'Hi {{name}},

Could you spare 2 minutes to share your experience with us?

{{form_link}}',
    'Share Feedback'
  ),
  -- Friendly Invite Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'invite',
    'friendly',
    '👋 We''d love to hear from you!',
    'Hey {{name}}! 

We''re so grateful to have you as a customer. Your experience matters to us, and we''d absolutely love to hear what you think!

Would you mind sharing a quick testimonial? It helps us grow and improve, plus there''s a little something special waiting for you at the end! 🎁',
    'Share Your Story'
  ),
  -- Formal Invite Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'invite',
    'formal',
    'Request for Feedback',
    'Dear {{name}},

Thank you for choosing our services. We value your opinion and would appreciate your feedback on your recent experience with us.

Your testimonial will help us continue to deliver excellent service and assist other customers in making informed decisions.

We appreciate your time and consideration.',
    'Provide Feedback'
  ),
  -- Default Thank You Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'thank_you',
    'default',
    'Thank you for your feedback! 🎉',
    'Hi {{name}},

Thank you so much for taking the time to share your feedback with us! We truly appreciate it.

Your testimonial means the world to us and helps others discover what makes our product special.

As promised, here''s your reward: {{reward}}

Thanks again!',
    null
  ),
  -- Short Thank You Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'thank_you',
    'short',
    'Thanks for your feedback!',
    'Hi {{name}},

Thanks for sharing! Here''s your reward: {{reward}}

Cheers!',
    null
  ),
  -- Friendly Thank You Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'thank_you',
    'friendly',
    'You''re awesome! Thank you! 🌟',
    'Hey {{name}}!

You just made our day! 💙 Thank you so much for taking the time to share your thoughts with us.

Your feedback is incredibly valuable, and we can''t wait to share your story with others!

Here''s that special reward we promised: {{reward}}

You''re the best!',
    null
  ),
  -- Formal Thank You Template
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'thank_you',
    'formal',
    'Thank You for Your Valuable Feedback',
    'Dear {{name}},

We sincerely appreciate you taking the time to provide your feedback. Your insights are invaluable to us and will help us continue to improve our services.

As a token of our appreciation, please find your reward: {{reward}}

Thank you for your continued support.',
    null
  );

-- Create function to increment form views
CREATE OR REPLACE FUNCTION increment_form_views(form_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE testimonial_forms 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = form_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;