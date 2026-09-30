-- Enable RLS on new testimonial tables

-- Enable RLS
ALTER TABLE testimonial_form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonial_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonial_invites ENABLE ROW LEVEL SECURITY;

-- Policies for testimonial_form_questions
CREATE POLICY "Users can view questions for their forms"
  ON testimonial_form_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM testimonial_forms
      WHERE testimonial_forms.id = testimonial_form_questions.form_id
      AND testimonial_forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions for their forms"
  ON testimonial_form_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM testimonial_forms
      WHERE testimonial_forms.id = testimonial_form_questions.form_id
      AND testimonial_forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions for their forms"
  ON testimonial_form_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM testimonial_forms
      WHERE testimonial_forms.id = testimonial_form_questions.form_id
      AND testimonial_forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions for their forms"
  ON testimonial_form_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM testimonial_forms
      WHERE testimonial_forms.id = testimonial_form_questions.form_id
      AND testimonial_forms.user_id = auth.uid()
    )
  );

-- Policies for testimonial_email_templates
CREATE POLICY "Users can view their email templates"
  ON testimonial_email_templates FOR SELECT
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Users can insert their email templates"
  ON testimonial_email_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their email templates"
  ON testimonial_email_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their email templates"
  ON testimonial_email_templates FOR DELETE
  USING (user_id = auth.uid());

-- Policies for testimonial_invites
CREATE POLICY "Users can view invites for their forms"
  ON testimonial_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM testimonial_forms
      WHERE testimonial_forms.id = testimonial_invites.form_id
      AND testimonial_forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invites for their forms"
  ON testimonial_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM testimonial_forms
      WHERE testimonial_forms.id = testimonial_invites.form_id
      AND testimonial_forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invites for their forms"
  ON testimonial_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM testimonial_forms
      WHERE testimonial_forms.id = testimonial_invites.form_id
      AND testimonial_forms.user_id = auth.uid()
    )
  );

-- Fix search_path for increment_form_views function
CREATE OR REPLACE FUNCTION increment_form_views(form_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE testimonial_forms 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = form_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;