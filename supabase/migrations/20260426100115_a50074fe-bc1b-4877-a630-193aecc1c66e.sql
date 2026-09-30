CREATE OR REPLACE FUNCTION public.admin_replay_integration_event(_event_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.integration_events
  SET processed_at = NULL,
      proof_object_id = NULL,
      status = 'received',
      error_message = NULL
  WHERE id = _event_id;

  RETURN FOUND;
END;
$function$;