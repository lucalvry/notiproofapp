-- Add account_type column to profiles (individual or organization)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'organization'));

-- Add organization_name column for organization accounts
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Update handle_new_user function to support account_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
BEGIN
  -- Insert profile with account_type from metadata
  INSERT INTO public.profiles (id, name, account_type, organization_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
    COALESCE(new.raw_user_meta_data ->> 'account_type', 'individual'),
    new.raw_user_meta_data ->> 'organization_name'
  );
  
  -- If organization account, create organization and add user as owner
  IF COALESCE(new.raw_user_meta_data ->> 'account_type', 'individual') = 'organization' 
     AND new.raw_user_meta_data ->> 'organization_name' IS NOT NULL THEN
    
    -- Generate unique slug
    org_slug := lower(regexp_replace(new.raw_user_meta_data ->> 'organization_name', '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Create organization
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (
      new.raw_user_meta_data ->> 'organization_name',
      org_slug,
      new.id
    )
    RETURNING id INTO org_id;
    
    -- Add user as owner in team_members
    INSERT INTO public.team_members (organization_id, user_id, role, joined_at, permissions)
    VALUES (
      org_id,
      new.id,
      'owner',
      now(),
      jsonb_build_object(
        'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
        'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
        'analytics', jsonb_build_object('view', true, 'export', true),
        'integrations', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
        'team', jsonb_build_object('invite', true, 'remove', true, 'edit_roles', true, 'view', true),
        'billing', jsonb_build_object('view', true, 'manage', true)
      )
    );
  END IF;
  
  -- Create email preferences
  INSERT INTO public.email_preferences (user_id, weekly_reports, marketing_emails, security_alerts)
  VALUES (new.id, true, true, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Create function to convert individual to organization account
CREATE OR REPLACE FUNCTION public.convert_to_organization(_user_id UUID, _organization_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
BEGIN
  -- Check if user is already an organization
  IF EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND account_type = 'organization') THEN
    RAISE EXCEPTION 'Account is already an organization';
  END IF;
  
  -- Generate unique slug
  org_slug := lower(regexp_replace(_organization_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
  
  -- Create organization
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (_organization_name, org_slug, _user_id)
  RETURNING id INTO org_id;
  
  -- Add user as owner
  INSERT INTO public.team_members (organization_id, user_id, role, joined_at, permissions)
  VALUES (
    org_id,
    _user_id,
    'owner',
    now(),
    jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', true),
      'integrations', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'team', jsonb_build_object('invite', true, 'remove', true, 'edit_roles', true, 'view', true),
      'billing', jsonb_build_object('view', true, 'manage', true)
    )
  );
  
  -- Update profile
  UPDATE profiles 
  SET account_type = 'organization', organization_name = _organization_name
  WHERE id = _user_id;
  
  RETURN org_id;
END;
$$;