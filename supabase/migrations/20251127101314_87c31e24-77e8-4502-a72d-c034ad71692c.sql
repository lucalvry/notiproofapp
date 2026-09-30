-- Create SECURITY DEFINER function for public testimonial submission
CREATE OR REPLACE FUNCTION public.submit_public_testimonial(
  _website_id UUID,
  _form_id UUID,
  _author_name TEXT,
  _message TEXT,
  _author_email TEXT DEFAULT NULL,
  _rating INTEGER DEFAULT NULL,
  _author_avatar_url TEXT DEFAULT NULL,
  _video_url TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _form_active BOOLEAN;
  _result_id UUID;
BEGIN
  -- Check if form exists and is active
  SELECT is_active INTO _form_active
  FROM testimonial_forms
  WHERE id = _form_id AND website_id = _website_id;
  
  IF _form_active IS NULL THEN
    RAISE EXCEPTION 'Form not found';
  END IF;
  
  IF NOT _form_active THEN
    RAISE EXCEPTION 'Form is not active';
  END IF;
  
  -- Insert testimonial
  INSERT INTO testimonials (
    website_id, form_id, source, author_name, author_email,
    rating, message, author_avatar_url, video_url, metadata, status
  ) VALUES (
    _website_id, _form_id, 'form', _author_name, _author_email,
    _rating, _message, _author_avatar_url, _video_url, _metadata, 'pending'
  )
  RETURNING id INTO _result_id;
  
  RETURN jsonb_build_object('id', _result_id);
END;
$$;

-- Allow anon and authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.submit_public_testimonial TO anon, authenticated;