
REVOKE EXECUTE ON FUNCTION public.is_agency_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_agency_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_assigned_to_client(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_agency_access_to_business(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_client_health_score(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_agency_approval_token() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_agency_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_agency_access_to_business(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_health_score(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_agency_approval_token() TO authenticated, service_role;
