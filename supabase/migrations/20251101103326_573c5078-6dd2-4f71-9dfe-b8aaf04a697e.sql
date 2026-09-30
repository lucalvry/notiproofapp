-- Create overloaded has_role function that accepts text parameter
-- This avoids type casting issues in RLS policy expressions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::public.app_role
  );
END;
$$;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Admins can manage all campaigns" ON public.campaigns;

-- Recreate the policy using text literal instead of type cast
CREATE POLICY "Admins can manage all campaigns"
ON public.campaigns
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'));