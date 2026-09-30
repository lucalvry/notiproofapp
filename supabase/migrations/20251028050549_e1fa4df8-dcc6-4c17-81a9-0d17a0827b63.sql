-- Fix P0-1: Set search_path on all SECURITY DEFINER functions to prevent SQL injection risks

ALTER FUNCTION public.increment_article_view_count(uuid) SET search_path = public;
ALTER FUNCTION public.update_article_helpful_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_primary_website(uuid) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_demo_events() SET search_path = public;
ALTER FUNCTION public.generate_demo_events(uuid, business_type) SET search_path = public;
ALTER FUNCTION public.increment_download_count() SET search_path = public;
ALTER FUNCTION public.update_template_rating() SET search_path = public;
ALTER FUNCTION public.increment_event_counter(uuid, text) SET search_path = public;