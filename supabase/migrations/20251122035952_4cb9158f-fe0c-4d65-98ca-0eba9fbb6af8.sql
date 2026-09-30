-- ============================================
-- PHASE 4: Part 1 - Add Unique Constraint
-- ============================================

-- Add unique constraint on template_key if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'templates_template_key_key'
  ) THEN
    ALTER TABLE public.templates 
    ADD CONSTRAINT templates_template_key_key UNIQUE (template_key);
  END IF;
END $$;

-- Remove Senja-branded template
DELETE FROM public.templates 
WHERE template_key = 'testimonial_senja_split';