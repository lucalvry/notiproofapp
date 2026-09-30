DROP POLICY IF EXISTS "admin insert user" ON public.users;
CREATE POLICY "admin or self insert user" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
