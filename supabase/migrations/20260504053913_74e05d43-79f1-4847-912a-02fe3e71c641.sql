DELETE FROM public.content_publish_events WHERE external_post_id='smoke-ec4-post-id';
UPDATE public.testimonial_requests SET campaign_id = NULL WHERE campaign_id='11111111-1111-1111-1111-111111111111';
DELETE FROM public.campaigns WHERE id='11111111-1111-1111-1111-111111111111';