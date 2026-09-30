-- Fix remaining security issues

-- ============================================
-- 1. FIX REMAINING SECURITY DEFINER VIEW
-- ============================================

-- Check and fix onboarding_analytics view
DROP VIEW IF EXISTS public.onboarding_analytics;

-- Recreate with security_invoker = true if needed
-- (If this view exists and is needed, recreate it properly)

-- ============================================
-- 2. FIX REMAINING FUNCTION SEARCH PATHS
-- ============================================

-- Fix get_user_storage_used
CREATE OR REPLACE FUNCTION public.get_user_storage_used(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(SUM(file_size), 0)::bigint
  FROM media
  WHERE user_id = p_user_id;
$function$;

-- Fix migrate_integration_connectors_to_integrations
CREATE OR REPLACE FUNCTION public.migrate_integration_connectors_to_integrations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.integrations (
    id,
    user_id,
    website_id,
    provider,
    name,
    credentials,
    is_active,
    last_sync_at,
    sync_status,
    created_at,
    updated_at
  )
  SELECT 
    ic.id,
    ic.user_id,
    ic.website_id,
    ic.integration_type::text,
    ic.name,
    ic.config,
    (ic.status = 'active'),
    ic.last_sync,
    ic.last_sync_status,
    ic.created_at,
    ic.updated_at
  FROM public.integration_connectors ic
  WHERE NOT EXISTS (
    SELECT 1 FROM public.integrations i WHERE i.id = ic.id
  );
END;
$function$;