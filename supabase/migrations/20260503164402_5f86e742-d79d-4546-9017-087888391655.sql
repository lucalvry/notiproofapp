-- Members can insert publish events for their business content pieces
CREATE POLICY "cpe_member_insert"
ON public.content_publish_events
FOR INSERT
TO authenticated
WITH CHECK (
  is_business_member(business_id) OR is_platform_admin()
);

-- Members can update (cancel/reschedule) their own publish events
CREATE POLICY "cpe_member_update"
ON public.content_publish_events
FOR UPDATE
TO authenticated
USING (is_business_member(business_id) OR is_platform_admin())
WITH CHECK (is_business_member(business_id) OR is_platform_admin());

-- Trigger to auto-update updated_at
CREATE TRIGGER cpe_set_updated_at
BEFORE UPDATE ON public.content_publish_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
