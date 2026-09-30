-- Create function to get database statistics
CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS TABLE (
  db_size_mb numeric,
  connection_count integer,
  active_widgets integer,
  pending_events integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND((pg_database_size(current_database()) / 1024.0 / 1024.0)::numeric, 2) as db_size_mb,
    (SELECT count(*)::integer FROM pg_stat_activity WHERE datname = current_database()) as connection_count,
    (SELECT count(*)::integer FROM widgets WHERE status = 'active') as active_widgets,
    (SELECT count(*)::integer FROM events WHERE status = 'pending') as pending_events;
END;
$$;