-- Notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'proof_pending_review',
  'testimonial_request_expired',
  'integration_disconnected'
);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NULL,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_business_created
  ON public.notifications (business_id, created_at DESC);
CREATE INDEX idx_notifications_business_unread
  ON public.notifications (business_id) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read notifications" ON public.notifications
  FOR SELECT USING (
    public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid())
  );

CREATE POLICY "members update notifications" ON public.notifications
  FOR UPDATE USING (
    public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid())
  ) WITH CHECK (
    public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid())
  );

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: new unapproved proof_object
CREATE OR REPLACE FUNCTION public.tg_notify_new_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved = false THEN
    INSERT INTO public.notifications (business_id, type, title, body, link)
    VALUES (
      NEW.business_id,
      'proof_pending_review',
      'New proof pending review',
      COALESCE(NEW.author_name, 'A customer') || ' submitted new proof.',
      '/proof/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_proof
AFTER INSERT ON public.proof_objects
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_proof();

-- Trigger: integration disconnected/error
CREATE OR REPLACE FUNCTION public.tg_notify_integration_disconnected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('disconnected','error')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (business_id, type, title, body, link)
    VALUES (
      NEW.business_id,
      'integration_disconnected',
      'Integration disconnected — action required',
      COALESCE(NEW.display_name, NEW.platform::text) || ' needs to be reconnected.',
      '/integrations/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_integration_disconnected
AFTER UPDATE OF status ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_integration_disconnected();

-- Sweep expired testimonial requests (callable via RPC)
CREATE OR REPLACE FUNCTION public.sweep_expired_testimonial_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  cnt integer := 0;
BEGIN
  FOR r IN
    UPDATE public.testimonial_requests
       SET status = 'expired'
     WHERE status IN ('pending','sent')
       AND expires_at < now()
    RETURNING id, business_id, customer_email
  LOOP
    INSERT INTO public.notifications (business_id, type, title, body, link)
    VALUES (
      r.business_id,
      'testimonial_request_expired',
      'Testimonial request expired',
      'No response from ' || COALESCE(r.customer_email, 'customer') || ' before expiry.',
      '/proof/request'
    );
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sweep_expired_testimonial_requests() TO authenticated;