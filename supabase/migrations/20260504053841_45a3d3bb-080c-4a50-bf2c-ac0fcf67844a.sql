-- EC1: create test campaign + link a request, then mark responded
INSERT INTO public.campaigns (id, business_id, name, type, is_active, request_config, trigger_config)
VALUES ('11111111-1111-1111-1111-111111111111',
        'd2c40bed-50ad-406b-bcfa-73dde2f455fa',
        'SMOKE: Phase 2 EC1', 'post_purchase', true, '{}'::jsonb, '{}'::jsonb);

-- attach an existing un-responded-but-fresh request: pick one with no campaign
WITH target AS (
  SELECT id FROM public.testimonial_requests
   WHERE business_id='d2c40bed-50ad-406b-bcfa-73dde2f455fa'
     AND campaign_id IS NULL
   ORDER BY created_at DESC LIMIT 1
)
UPDATE public.testimonial_requests tr
   SET campaign_id = '11111111-1111-1111-1111-111111111111',
       responded_at = NULL
  FROM target WHERE tr.id = target.id;

-- now simulate the response (NULL -> now()) which should fire the trigger
WITH target AS (
  SELECT id FROM public.testimonial_requests
   WHERE campaign_id='11111111-1111-1111-1111-111111111111' LIMIT 1
)
UPDATE public.testimonial_requests tr
   SET responded_at = now()
  FROM target WHERE tr.id = target.id;

-- EC4: insert a publish event with new analytics columns
INSERT INTO public.content_publish_events
  (business_id, content_piece_id, status, impressions, clicks, external_post_id, payload)
SELECT business_id, id, 'published', 42, 7, 'smoke-ec4-post-id', jsonb_build_object('smoke', true)
FROM public.content_pieces LIMIT 1;