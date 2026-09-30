
-- Agency team invitations table for inviting members by email
CREATE TABLE IF NOT EXISTS public.agency_team_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  token           text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_team_invitations TO authenticated;
GRANT ALL ON public.agency_team_invitations TO service_role;
ALTER TABLE public.agency_team_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ati_agency ON public.agency_team_invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_ati_email ON public.agency_team_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_ati_token ON public.agency_team_invitations(token);

CREATE POLICY ati_admin_select ON public.agency_team_invitations
  FOR SELECT TO authenticated USING (public.is_agency_admin(agency_id));
CREATE POLICY ati_admin_insert ON public.agency_team_invitations
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_admin(agency_id));
CREATE POLICY ati_admin_update ON public.agency_team_invitations
  FOR UPDATE TO authenticated USING (public.is_agency_admin(agency_id));
CREATE POLICY ati_admin_delete ON public.agency_team_invitations
  FOR DELETE TO authenticated USING (public.is_agency_admin(agency_id));

CREATE TRIGGER set_updated_at_agency_team_invitations
  BEFORE UPDATE ON public.agency_team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC: accept an invitation as the currently signed-in user (email-matched)
CREATE OR REPLACE FUNCTION public.accept_agency_team_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.agency_team_invitations%ROWTYPE;
  member_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.agency_team_invitations
   WHERE token = _token AND status = 'pending' AND expires_at > now()
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalid or expired';
  END IF;

  IF lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email';
  END IF;

  INSERT INTO public.agency_team_members (agency_id, user_id, role, invited_by, invitation_accepted_at)
  VALUES (inv.agency_id, auth.uid(), inv.role, inv.invited_by, now())
  ON CONFLICT (agency_id, user_id) DO UPDATE
    SET invitation_accepted_at = COALESCE(public.agency_team_members.invitation_accepted_at, now()),
        role = EXCLUDED.role,
        updated_at = now()
  RETURNING id INTO member_id;

  UPDATE public.agency_team_invitations
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = inv.id;

  RETURN inv.agency_id;
END;
$$;

-- RPC to look up an invitation's agency name by token (for the accept page).
CREATE OR REPLACE FUNCTION public.get_agency_team_invitation(_token text)
RETURNS TABLE(agency_id uuid, agency_name text, email text, role text, expires_at timestamptz, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.agency_id, a.name, i.email, i.role, i.expires_at, i.status
  FROM public.agency_team_invitations i
  JOIN public.agencies a ON a.id = i.agency_id
  WHERE i.token = _token
  LIMIT 1;
$$;
