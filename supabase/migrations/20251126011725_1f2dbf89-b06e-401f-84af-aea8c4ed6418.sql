-- Enable RLS on notification_weights table
ALTER TABLE notification_weights ENABLE ROW LEVEL SECURITY;

-- Users can view weights for their websites
CREATE POLICY "Users can view weights for their websites"
ON notification_weights
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM websites w
    WHERE w.id = notification_weights.website_id
    AND w.user_id = auth.uid()
  )
);

-- Users can manage weights for their websites
CREATE POLICY "Users can manage weights for their websites"
ON notification_weights
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM websites w
    WHERE w.id = notification_weights.website_id
    AND w.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM websites w
    WHERE w.id = notification_weights.website_id
    AND w.user_id = auth.uid()
  )
);

-- Admins can view all weights
CREATE POLICY "Admins can view all weights"
ON notification_weights
FOR SELECT
USING (has_role(auth.uid(), 'admin'));