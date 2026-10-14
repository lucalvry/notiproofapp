CREATE OR REPLACE FUNCTION public.plan_limits(_plan text)
 RETURNS TABLE(proof_limit integer, event_limit integer, domain_limit integer, storage_mb integer, max_video_seconds integer, remove_branding boolean, active_widget_limit integer, data_retention_days integer, team_seats_included integer)
 LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT
    CASE _plan WHEN 'starter' THEN 1000 WHEN 'growth' THEN 10000 WHEN 'agency' THEN 100000 ELSE 100 END,
    CASE _plan WHEN 'starter' THEN 100000 WHEN 'growth' THEN 1000000 WHEN 'agency' THEN 10000000 ELSE 10000 END,
    CASE _plan WHEN 'starter' THEN 5 WHEN 'growth' THEN 20 WHEN 'agency' THEN 2147483647 ELSE 1 END,
    CASE _plan WHEN 'starter' THEN 1000 WHEN 'growth' THEN 10000 WHEN 'agency' THEN 100000 ELSE 100 END,
    CASE _plan WHEN 'starter' THEN 60 WHEN 'growth' THEN 180 WHEN 'agency' THEN 300 ELSE 30 END,
    CASE _plan WHEN 'free' THEN false ELSE true END,
    CASE _plan WHEN 'free' THEN 3 ELSE 2147483647 END,
    CASE _plan WHEN 'starter' THEN 90 WHEN 'growth' THEN 365 WHEN 'agency' THEN 36500 ELSE 30 END,
    1;
$function$;

UPDATE public.businesses b SET website_url = 'https://' || d.domain
FROM (SELECT DISTINCT ON (business_id) business_id, domain FROM public.business_domains ORDER BY business_id, is_primary DESC, created_at) d
WHERE d.business_id = b.id AND (b.website_url IS NULL OR btrim(b.website_url) = '');