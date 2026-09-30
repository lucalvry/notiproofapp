-- Add moderator to app_role enum if it doesn't exist
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'moderator';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;