CREATE OR REPLACE FUNCTION public.enforce_seat_limit_on_member()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  plan_key text;
  included int;
  extra int;
  members int;
BEGIN
  SELECT plan, COALESCE(extra_seats_purchased, 0)
    INTO plan_key, extra
    FROM public.businesses WHERE id = NEW.business_id;
  IF plan_key IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT team_seats_included INTO included FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO members FROM public.business_users WHERE business_id = NEW.business_id;
  IF members >= (included + extra) THEN
    RAISE EXCEPTION 'Team seat limit reached for current plan — upgrade or purchase extra seats' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_seat_limit_on_invite()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF NOT public.can_invite_seat(NEW.business_id) THEN
      RAISE EXCEPTION 'Team seat limit reached for current plan — upgrade or purchase extra seats' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_seat_member ON public.business_users;
CREATE TRIGGER trg_enforce_seat_member
BEFORE INSERT ON public.business_users
FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit_on_member();

DROP TRIGGER IF EXISTS trg_enforce_seat_invite ON public.team_invitations;
CREATE TRIGGER trg_enforce_seat_invite
BEFORE INSERT ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit_on_invite();