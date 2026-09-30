-- Add superadmin to app_role enum if it doesn't exist
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can manage all team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can view all team members" ON team_members;
DROP POLICY IF EXISTS "Users can view active integration configs" ON integrations_config;

-- Organizations: Allow admins to view all
CREATE POLICY "Admins can view all organizations"
ON organizations FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Team invitations: Allow admins to manage all
CREATE POLICY "Admins can manage all team invitations"
ON team_invitations FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Team members: Allow admins to view all
CREATE POLICY "Admins can view all team members"
ON team_members FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Integration configs: Allow users to view active ones
CREATE POLICY "Users can view active integration configs"
ON integrations_config FOR SELECT 
TO authenticated
USING (is_active = true);