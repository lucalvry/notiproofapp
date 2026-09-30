-- Phase 1: Security Critical Fixes

-- 1. Fix function search paths (security hardening)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'superadmin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'superadmin'
  )
$$;

-- 2. Grant first superadmin role
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'mrolayokun@gmail.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Grant superadmin role
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (admin_user_id, 'superadmin', admin_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);

-- 4. Add audit log trigger for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      COALESCE(auth.uid(), NEW.granted_by),
      'grant_role',
      'user_role',
      NEW.user_id,
      jsonb_build_object('role', NEW.role)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'update_role',
      'user_role',
      NEW.user_id,
      jsonb_build_object('new_role', NEW.role, 'old_role', OLD.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'revoke_role',
      'user_role',
      OLD.user_id,
      jsonb_build_object('role', OLD.role)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_role_changes ON public.user_roles;
CREATE TRIGGER trigger_log_role_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();