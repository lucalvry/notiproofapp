-- Phase 1: Database Schema Enhancement for Template-Campaign Type Mapping

-- Step 1.1: Add supported_campaign_types column to marketplace_templates
ALTER TABLE public.marketplace_templates 
ADD COLUMN IF NOT EXISTS supported_campaign_types TEXT[] DEFAULT '{}';

-- Step 1.3: Add business_types and priority columns
ALTER TABLE public.marketplace_templates 
ADD COLUMN IF NOT EXISTS business_types TEXT[] DEFAULT '{}';

ALTER TABLE public.marketplace_templates 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50;

-- Add index on supported_campaign_types for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_campaign_types 
ON public.marketplace_templates USING GIN (supported_campaign_types);

-- Add index on business_types for filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_business_types 
ON public.marketplace_templates USING GIN (business_types);

-- Step 1.2: Update existing templates with campaign type mappings

-- 1. Social Proof Counter → active-users, live-visitor-count
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['active-users', 'live-visitor-count'],
  business_types = ARRAY['ecommerce', 'saas', 'services'],
  priority = 90
WHERE name = 'Social Proof Counter';

-- 2. Recent Purchase Alert → recent-purchase
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['recent-purchase', 'conversion-notification'],
  business_types = ARRAY['ecommerce'],
  priority = 95
WHERE name = 'Recent Purchase Alert';

-- 3. Email Signup Success → email-signup, newsletter-signup
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['email-signup', 'newsletter-signup'],
  business_types = ARRAY['ecommerce', 'saas', 'services', 'blog', 'marketing_agency'],
  priority = 85
WHERE name = 'Email Signup Success';

-- 4. New User Signup → new-signup
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['new-signup', 'account-signup'],
  business_types = ARRAY['saas', 'ecommerce', 'services'],
  priority = 90
WHERE name = 'New User Signup';

-- 5. Limited Offer Timer → limited-time-offer
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['limited-time-offer', 'flash-sale'],
  business_types = ARRAY['ecommerce'],
  priority = 85
WHERE name = 'Limited Offer Timer';

-- 6. Product Review Spotlight → product-review
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['product-review', 'customer-testimonial'],
  business_types = ARRAY['ecommerce'],
  priority = 80
WHERE name = 'Product Review Spotlight';

-- 7. Course Enrollment Alert → course-enrollment
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['course-enrollment'],
  business_types = ARRAY['education'],
  priority = 95
WHERE name = 'Course Enrollment Alert';

-- 8. Demo Request Notification → demo-request
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['demo-request'],
  business_types = ARRAY['saas', 'services'],
  priority = 90
WHERE name = 'Demo Request Notification';

-- 9. Trial Expiring Soon → trial-expiration
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['trial-expiration'],
  business_types = ARRAY['saas'],
  priority = 85
WHERE name = 'Trial Expiring Soon';

-- 10. Popular Post Alert → blog-engagement
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['blog-engagement', 'trending-content'],
  business_types = ARRAY['blog', 'news_media'],
  priority = 75
WHERE name = 'Popular Post Alert';

-- 11. Low Stock Warning → low-stock-alert
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['low-stock-alert'],
  business_types = ARRAY['ecommerce'],
  priority = 80
WHERE name = 'Low Stock Warning';

-- 12. Certificate Awarded → student-achievement
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['student-achievement', 'completion-milestone'],
  business_types = ARRAY['education'],
  priority = 85
WHERE name = 'Certificate Awarded';

-- 13. Feature Announcement → feature-update
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['feature-update', 'product-launch'],
  business_types = ARRAY['saas', 'ecommerce'],
  priority = 70
WHERE name = 'Feature Announcement';

-- 14. Appointment Booked → appointment-booking
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['appointment-booking'],
  business_types = ARRAY['services', 'healthcare'],
  priority = 90
WHERE name = 'Appointment Booked';

-- 15. New Subscriber Welcome → newsletter-signup
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['newsletter-signup', 'email-signup'],
  business_types = ARRAY['blog', 'marketing_agency', 'news_media'],
  priority = 80
WHERE name = 'New Subscriber Welcome';

-- 16. Cart Addition Notification → cart-activity
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['cart-activity'],
  business_types = ARRAY['ecommerce'],
  priority = 75
WHERE name = 'Cart Addition Notification';

-- 17. Live Class Reminder → live-class
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['live-class', 'webinar-reminder'],
  business_types = ARRAY['education', 'events'],
  priority = 85
WHERE name = 'Live Class Reminder';

-- 18. Recent Comment Activity → comment-activity
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['comment-activity', 'blog-engagement'],
  business_types = ARRAY['blog', 'news_media'],
  priority = 70
WHERE name = 'Recent Comment Activity';

-- 19. Patient Review → patient-testimonial
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['patient-testimonial', 'customer-testimonial'],
  business_types = ARRAY['healthcare'],
  priority = 90
WHERE name = 'Patient Review';

-- 20. Live User Count → active-users, live-visitor-count
UPDATE public.marketplace_templates 
SET 
  supported_campaign_types = ARRAY['active-users', 'live-visitor-count'],
  business_types = ARRAY['saas', 'ecommerce', 'events'],
  priority = 85
WHERE name = 'Live User Count';

-- Add comment for documentation
COMMENT ON COLUMN public.marketplace_templates.supported_campaign_types IS 'Array of campaign type IDs that this template supports';
COMMENT ON COLUMN public.marketplace_templates.business_types IS 'Array of business types this template is optimized for';
COMMENT ON COLUMN public.marketplace_templates.priority IS 'Template ranking priority (0-100, higher = better match)';
