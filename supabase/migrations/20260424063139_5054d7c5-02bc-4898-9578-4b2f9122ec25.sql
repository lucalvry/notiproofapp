ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending',
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid,
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_invitations_status_check CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  CONSTRAINT team_invitations_email_check CHECK (position('@' in email) > 1),
  CONSTRAINT team_invitations_unique_pending UNIQUE (business_id, email, status)
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view business invitations"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  public.has_business_role(business_id, 'owner'::public.app_role)
  OR public.is_platform_admin()
  OR lower(email) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY "Owners can create business invitations"
ON public.team_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_business_role(business_id, 'owner'::public.app_role)
  OR public.is_platform_admin()
);

CREATE POLICY "Owners can update business invitations"
ON public.team_invitations
FOR UPDATE
TO authenticated
USING (
  public.has_business_role(business_id, 'owner'::public.app_role)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.has_business_role(business_id, 'owner'::public.app_role)
  OR public.is_platform_admin()
);

CREATE POLICY "Owners can delete business invitations"
ON public.team_invitations
FOR DELETE
TO authenticated
USING (
  public.has_business_role(business_id, 'owner'::public.app_role)
  OR public.is_platform_admin()
);

CREATE TRIGGER set_team_invitations_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  admin_user_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Platform admins can create audit log"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.accept_team_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation public.team_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation
  FROM public.team_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
    AND lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation is invalid or has expired';
  END IF;

  INSERT INTO public.business_users (business_id, user_id, role)
  VALUES (invitation.business_id, auth.uid(), invitation.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = invitation.id;

  RETURN invitation.business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_admin_action(_business_id uuid, _action text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can log admin actions';
  END IF;

  INSERT INTO public.admin_audit_log (business_id, admin_user_id, action, details)
  VALUES (_business_id, auth.uid(), _action, COALESCE(_details, '{}'::jsonb))
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_team_invitations_business_status ON public.team_invitations (business_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations (token);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_business_created ON public.admin_audit_log (business_id, created_at DESC);