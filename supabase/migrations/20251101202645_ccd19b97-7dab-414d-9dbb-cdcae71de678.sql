-- Phase 3 Week 9: Team Collaboration System

-- 1. Expand team_role enum to include editor and viewer
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. Add permissions and website_access columns to team_members
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT jsonb_build_object(
  'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
  'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
  'analytics', jsonb_build_object('view', true, 'export', false),
  'integrations', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
  'team', jsonb_build_object('invite', false, 'remove', false, 'edit_roles', false, 'view', true),
  'billing', jsonb_build_object('view', false, 'manage', false)
);

ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS website_access JSONB DEFAULT '{"type": "all", "website_ids": []}';

-- 3. Create function to get default permissions based on role
CREATE OR REPLACE FUNCTION get_default_permissions_for_role(_role team_role)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CASE _role
    WHEN 'owner' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', true),
      'integrations', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'team', jsonb_build_object('invite', true, 'remove', true, 'edit_roles', true, 'view', true),
      'billing', jsonb_build_object('view', true, 'manage', true)
    )
    WHEN 'admin' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', true),
      'integrations', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'team', jsonb_build_object('invite', true, 'remove', true, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', true, 'manage', false)
    )
    WHEN 'editor' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', false),
      'integrations', jsonb_build_object('create', false, 'edit', true, 'delete', false, 'view', true),
      'team', jsonb_build_object('invite', false, 'remove', false, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', false, 'manage', false)
    )
    WHEN 'viewer' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'widgets', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', false),
      'integrations', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'team', jsonb_build_object('invite', false, 'remove', false, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', false, 'manage', false)
    )
    ELSE jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', false),
      'integrations', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'team', jsonb_build_object('invite', false, 'remove', false, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', false, 'manage', false)
    )
  END;
END;
$$;

-- 4. Create trigger to set default permissions when team member is added
CREATE OR REPLACE FUNCTION set_default_team_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set default permissions based on role if not explicitly set
  IF NEW.permissions IS NULL OR NEW.permissions = '{}'::jsonb THEN
    NEW.permissions := get_default_permissions_for_role(NEW.role);
  END IF;
  
  -- Set default website access to all if not explicitly set
  IF NEW.website_access IS NULL OR NEW.website_access = '{}'::jsonb THEN
    NEW.website_access := '{"type": "all", "website_ids": []}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_team_member_defaults ON team_members;
CREATE TRIGGER set_team_member_defaults
BEFORE INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION set_default_team_permissions();

-- 5. Create function to check if user has specific team permission
CREATE OR REPLACE FUNCTION user_has_team_permission(
  _user_id uuid,
  _org_id uuid,
  _resource text,
  _action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_permissions jsonb;
BEGIN
  SELECT permissions INTO member_permissions
  FROM team_members
  WHERE user_id = _user_id 
    AND organization_id = _org_id;
  
  IF member_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE(
    (member_permissions->_resource->>_action)::boolean,
    false
  );
END;
$$;

-- 6. Create function to check if user has access to specific website
CREATE OR REPLACE FUNCTION user_has_website_access(
  _user_id uuid,
  _website_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_access jsonb;
  access_type text;
BEGIN
  -- Get website's organization
  SELECT tm.website_access INTO member_access
  FROM team_members tm
  JOIN websites w ON w.user_id = (
    SELECT o.created_by 
    FROM organizations o 
    WHERE o.id = tm.organization_id
  )
  WHERE tm.user_id = _user_id 
    AND w.id = _website_id;
  
  IF member_access IS NULL THEN
    -- Check if user owns the website directly
    RETURN EXISTS (
      SELECT 1 FROM websites WHERE id = _website_id AND user_id = _user_id
    );
  END IF;
  
  access_type := member_access->>'type';
  
  IF access_type = 'all' THEN
    RETURN true;
  ELSIF access_type = 'specific' THEN
    RETURN member_access->'website_ids' @> to_jsonb(_website_id::text);
  ELSE
    RETURN false;
  END IF;
END;
$$;