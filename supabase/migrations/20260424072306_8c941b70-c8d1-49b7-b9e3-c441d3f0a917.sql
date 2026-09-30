
ALTER TYPE public.proof_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.testimonial_request_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE public.testimonial_request_status ADD VALUE IF NOT EXISTS 'opened';
ALTER TYPE public.testimonial_request_status ADD VALUE IF NOT EXISTS 'responded';
