-- Create function for atomic counter increments
CREATE OR REPLACE FUNCTION increment_event_counter(
  event_id UUID,
  counter_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF counter_type = 'views' THEN
    UPDATE events SET views = COALESCE(views, 0) + 1 WHERE id = event_id;
  ELSIF counter_type = 'clicks' THEN
    UPDATE events SET clicks = COALESCE(clicks, 0) + 1 WHERE id = event_id;
  END IF;
END;
$$;