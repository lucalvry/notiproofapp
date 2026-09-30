-- Create migration_log table for tracking migration progress
CREATE TABLE IF NOT EXISTS public.migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_type TEXT NOT NULL CHECK (migration_type IN ('campaign', 'event')),
  batch_number INTEGER DEFAULT 1,
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_details JSONB,
  performed_by UUID REFERENCES auth.users(id),
  dry_run BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view migration logs"
  ON public.migration_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Admins can insert logs
CREATE POLICY "Admins can insert migration logs"
  ON public.migration_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_migration_log_type_started 
  ON public.migration_log(migration_type, started_at DESC);

-- Add comment
COMMENT ON TABLE public.migration_log IS 'Tracks data migration activities for Phase 11 rollout';
