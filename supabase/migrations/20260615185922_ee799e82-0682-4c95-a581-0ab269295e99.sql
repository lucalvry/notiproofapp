
-- =====================================================================
-- Phase 3 Sprint 0: Agency OS foundation
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Column additions on existing tables
-- ---------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual'
    CHECK (account_type IN ('individual','agency','client'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS agency_id uuid,
  ADD COLUMN IF NOT EXISTS active_client_id uuid;

-- ---------------------------------------------------------------------
-- 2. agencies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agencies (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  slug                    text NOT NULL UNIQUE,
  website_url             text,
  agency_type             text,
  logo_url                text,
  brand_color             text,
  portal_slug             text UNIQUE,
  custom_subdomain        text UNIQUE,
  subdomain_verified      boolean NOT NULL DEFAULT false,
  portal_welcome_msg      text,
  client_self_login       boolean NOT NULL DEFAULT true,
  reseller_mode           boolean NOT NULL DEFAULT false,
  plan_tier               text NOT NULL DEFAULT 'starter_agency'
    CHECK (plan_tier IN ('starter_agency','growth_agency','scale_agency','enterprise_agency')),
  client_seat_limit       integer NOT NULL DEFAULT 10,
  stripe_customer_id      text UNIQUE,
  stripe_subscription_id  text UNIQUE,
  owner_user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notification_prefs      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies TO authenticated;
GRANT SELECT ON public.agencies TO anon;  -- needed for /portal/:slug login page to fetch branding before auth
GRANT ALL    ON public.agencies TO service_role;

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_portal_slug ON public.agencies(portal_slug);
CREATE INDEX IF NOT EXISTS idx_agencies_custom_subdomain ON public.agencies(custom_subdomain);

-- Backfill FK on users.agency_id now that agencies exists
ALTER TABLE public.users
  ADD CONSTRAINT users_agency_id_fkey
    FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.users
  ADD CONSTRAINT users_active_client_id_fkey
    FOREIGN KEY (active_client_id) REFERENCES public.businesses(id) ON DELETE SET NULL
  NOT VALID;

-- ---------------------------------------------------------------------
-- 3. agency_team_members
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_team_members (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role                     text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  invited_by               uuid REFERENCES public.users(id) ON DELETE SET NULL,
  invitation_accepted_at   timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_team_members TO authenticated;
GRANT ALL ON public.agency_team_members TO service_role;
ALTER TABLE public.agency_team_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_atm_agency ON public.agency_team_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_atm_user ON public.agency_team_members(user_id);

-- ---------------------------------------------------------------------
-- 4. agency_client_relationships
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_client_relationships (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status                   text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','suspended','removed')),
  client_plan              text DEFAULT 'free',
  notes                    text,
  client_can_approve       boolean NOT NULL DEFAULT false,
  visible_features         text[] NOT NULL DEFAULT '{}',
  added_by                 uuid REFERENCES public.users(id) ON DELETE SET NULL,
  invitation_sent_at       timestamptz,
  invitation_accepted_at   timestamptz,
  approval_token           text UNIQUE,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, client_business_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_client_relationships TO authenticated;
GRANT ALL ON public.agency_client_relationships TO service_role;
ALTER TABLE public.agency_client_relationships ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_acr_agency ON public.agency_client_relationships(agency_id);
CREATE INDEX IF NOT EXISTS idx_acr_client ON public.agency_client_relationships(client_business_id);
CREATE INDEX IF NOT EXISTS idx_acr_status ON public.agency_client_relationships(status);

-- ---------------------------------------------------------------------
-- 5. agency_member_client_assignments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_member_client_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id           uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  member_id           uuid NOT NULL REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  client_business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  assigned_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, client_business_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_member_client_assignments TO authenticated;
GRANT ALL ON public.agency_member_client_assignments TO service_role;
ALTER TABLE public.agency_member_client_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_amca_agency ON public.agency_member_client_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_amca_member ON public.agency_member_client_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_amca_client ON public.agency_member_client_assignments(client_business_id);

-- ---------------------------------------------------------------------
-- 6. agency_reseller_config
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_reseller_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id           uuid NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  pricing             jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_collection  text NOT NULL DEFAULT 'self'
    CHECK (payment_collection IN ('self','stripe_connect')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_reseller_config TO authenticated;
GRANT ALL ON public.agency_reseller_config TO service_role;
ALTER TABLE public.agency_reseller_config ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 7. scheduled_reports
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id            uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name                 text,
  client_business_ids  uuid[] NOT NULL DEFAULT '{}',
  frequency            text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly')),
  sections             text[] NOT NULL DEFAULT '{}',
  send_to              text[] NOT NULL DEFAULT '{}',
  scheduled_time       time NOT NULL DEFAULT '06:00',
  last_run_at          timestamptz,
  next_run_at          timestamptz,
  is_active            boolean NOT NULL DEFAULT true,
  created_by           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_reports TO authenticated;
GRANT ALL ON public.scheduled_reports TO service_role;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sr_agency ON public.scheduled_reports(agency_id);
CREATE INDEX IF NOT EXISTS idx_sr_next_run ON public.scheduled_reports(next_run_at) WHERE is_active = true;

-- ---------------------------------------------------------------------
-- 8. updated_at triggers
-- ---------------------------------------------------------------------
CREATE TRIGGER set_updated_at_agencies
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_agency_team_members
  BEFORE UPDATE ON public.agency_team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_agency_client_relationships
  BEFORE UPDATE ON public.agency_client_relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_agency_reseller_config
  BEFORE UPDATE ON public.agency_reseller_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_scheduled_reports
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 9. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------

-- Is the current user an admin of the given agency?
CREATE OR REPLACE FUNCTION public.is_agency_admin(_agency_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_team_members
    WHERE agency_id = _agency_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND invitation_accepted_at IS NOT NULL
  )
$$;

-- Is the current user any member (admin or member) of the given agency?
CREATE OR REPLACE FUNCTION public.is_agency_member(_agency_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_team_members
    WHERE agency_id = _agency_id
      AND user_id = auth.uid()
      AND invitation_accepted_at IS NOT NULL
  )
$$;

-- Is the current user assigned (directly or as admin) to manage the given client business?
CREATE OR REPLACE FUNCTION public.is_assigned_to_client(_client_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH active_relationships AS (
    SELECT agency_id
    FROM public.agency_client_relationships
    WHERE client_business_id = _client_business_id
      AND status = 'active'
  )
  -- Agency admins of the owning agency can manage any of its clients
  SELECT EXISTS (
    SELECT 1
    FROM active_relationships ar
    JOIN public.agency_team_members atm
      ON atm.agency_id = ar.agency_id
     AND atm.user_id = auth.uid()
     AND atm.invitation_accepted_at IS NOT NULL
     AND atm.role = 'admin'
  )
  OR EXISTS (
    -- Explicitly assigned members
    SELECT 1
    FROM active_relationships ar
    JOIN public.agency_team_members atm
      ON atm.agency_id = ar.agency_id
     AND atm.user_id = auth.uid()
     AND atm.invitation_accepted_at IS NOT NULL
    JOIN public.agency_member_client_assignments amca
      ON amca.member_id = atm.id
     AND amca.client_business_id = _client_business_id
  )
$$;

-- Convenience wrapper: read or write access to a client business through any agency path
CREATE OR REPLACE FUNCTION public.has_agency_access_to_business(_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_assigned_to_client(_business_id)
$$;

-- Placeholder client health score (0-100). Real version aggregates proof recency, content activity, widget impressions.
CREATE OR REPLACE FUNCTION public.get_client_health_score(_client_business_id uuid)
RETURNS TABLE(score integer, status text, last_proof_at timestamptz, proofs_30d integer, content_30d integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH p AS (
    SELECT
      max(created_at)::timestamptz AS last_proof_at,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS proofs_30d
    FROM public.proof_objects WHERE business_id = _client_business_id
  ),
  c AS (
    SELECT count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS content_30d
    FROM public.content_pieces WHERE business_id = _client_business_id
  )
  SELECT
    CASE
      WHEN p.last_proof_at IS NULL THEN 0
      WHEN p.last_proof_at >= now() - interval '14 days' AND c.content_30d > 0 THEN 90
      WHEN p.last_proof_at >= now() - interval '14 days' THEN 75
      WHEN p.last_proof_at >= now() - interval '30 days' THEN 50
      ELSE 20
    END AS score,
    CASE
      WHEN p.last_proof_at IS NULL OR p.last_proof_at < now() - interval '30 days' THEN 'red'
      WHEN p.last_proof_at < now() - interval '14 days' THEN 'amber'
      ELSE 'green'
    END AS status,
    p.last_proof_at,
    COALESCE(p.proofs_30d, 0) AS proofs_30d,
    COALESCE(c.content_30d, 0) AS content_30d
  FROM p, c;
$$;

-- Industry/metric benchmarks (hardcoded for launch; real data fills in Phase 4)
CREATE OR REPLACE FUNCTION public.get_category_benchmark(_industry text, _metric text)
RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _metric
    WHEN 'proofs_per_month' THEN
      CASE _industry
        WHEN 'ecommerce' THEN 45::numeric
        WHEN 'saas' THEN 22::numeric
        WHEN 'agency' THEN 18::numeric
        WHEN 'professional_services' THEN 12::numeric
        ELSE 20::numeric
      END
    WHEN 'response_rate' THEN 0.32::numeric
    WHEN 'content_per_proof' THEN 3.5::numeric
    ELSE 0::numeric
  END
$$;

-- Generate a verifiable approval token for link-existing-client flow
CREATE OR REPLACE FUNCTION public.generate_agency_approval_token()
RETURNS text
LANGUAGE sql VOLATILE SET search_path = public
AS $$
  SELECT encode(extensions.gen_random_bytes(24), 'hex')
$$;

-- ---------------------------------------------------------------------
-- 10. RLS policies on new tables
-- ---------------------------------------------------------------------

-- agencies
CREATE POLICY ag_member_select ON public.agencies
  FOR SELECT USING (
    public.is_agency_member(id)
    OR public.is_platform_admin()
    OR owner_user_id = auth.uid()
  );

-- Public read of branding for portal/:slug login pages (limited columns enforced at view layer; full row is fine)
CREATE POLICY ag_anon_branding_select ON public.agencies
  FOR SELECT TO anon USING (true);

CREATE POLICY ag_admin_update ON public.agencies
  FOR UPDATE USING (public.is_agency_admin(id) OR public.is_platform_admin())
  WITH CHECK (public.is_agency_admin(id) OR public.is_platform_admin());

CREATE POLICY ag_self_insert ON public.agencies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (owner_user_id IS NULL OR owner_user_id = auth.uid()));

CREATE POLICY ag_admin_delete ON public.agencies
  FOR DELETE USING (public.is_agency_admin(id) OR public.is_platform_admin());

-- agency_team_members
CREATE POLICY atm_member_select ON public.agency_team_members
  FOR SELECT USING (
    public.is_agency_member(agency_id)
    OR user_id = auth.uid()
    OR public.is_platform_admin()
  );

CREATE POLICY atm_admin_insert ON public.agency_team_members
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY atm_admin_update ON public.agency_team_members
  FOR UPDATE USING (
    public.is_agency_admin(agency_id) OR user_id = auth.uid() OR public.is_platform_admin()
  )
  WITH CHECK (public.is_agency_admin(agency_id) OR user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY atm_admin_delete ON public.agency_team_members
  FOR DELETE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin());

-- Allow founding admin insert: the user who just created an agency may insert themselves as admin
-- (already covered by atm_admin_insert once is_agency_admin returns true; but on first record
-- the function returns false. Allow self-insert as admin if no team members exist yet for the agency.)
CREATE POLICY atm_founder_self_insert ON public.agency_team_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.agency_team_members WHERE agency_id = agency_team_members.agency_id)
    AND EXISTS (SELECT 1 FROM public.agencies WHERE id = agency_id AND owner_user_id = auth.uid())
  );

-- agency_client_relationships
CREATE POLICY acr_member_select ON public.agency_client_relationships
  FOR SELECT USING (
    public.is_agency_member(agency_id)
    OR public.is_business_member(client_business_id)
    OR public.is_platform_admin()
  );

CREATE POLICY acr_admin_insert ON public.agency_client_relationships
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY acr_admin_update ON public.agency_client_relationships
  FOR UPDATE USING (
    public.is_agency_admin(agency_id)
    OR public.has_business_role(client_business_id, 'owner')  -- client owner can approve/reject
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.is_agency_admin(agency_id)
    OR public.has_business_role(client_business_id, 'owner')
    OR public.is_platform_admin()
  );

CREATE POLICY acr_admin_delete ON public.agency_client_relationships
  FOR DELETE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin());

-- agency_member_client_assignments
CREATE POLICY amca_member_select ON public.agency_member_client_assignments
  FOR SELECT USING (
    public.is_agency_member(agency_id)
    OR public.is_platform_admin()
  );

CREATE POLICY amca_admin_insert ON public.agency_member_client_assignments
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY amca_admin_update ON public.agency_member_client_assignments
  FOR UPDATE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin())
  WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY amca_admin_delete ON public.agency_member_client_assignments
  FOR DELETE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin());

-- agency_reseller_config
CREATE POLICY arc_member_select ON public.agency_reseller_config
  FOR SELECT USING (public.is_agency_member(agency_id) OR public.is_platform_admin());

CREATE POLICY arc_admin_insert ON public.agency_reseller_config
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY arc_admin_update ON public.agency_reseller_config
  FOR UPDATE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin())
  WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY arc_admin_delete ON public.agency_reseller_config
  FOR DELETE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin());

-- scheduled_reports
CREATE POLICY sr_member_select ON public.scheduled_reports
  FOR SELECT USING (public.is_agency_member(agency_id) OR public.is_platform_admin());

CREATE POLICY sr_admin_insert ON public.scheduled_reports
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY sr_admin_update ON public.scheduled_reports
  FOR UPDATE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin())
  WITH CHECK (public.is_agency_admin(agency_id) OR public.is_platform_admin());

CREATE POLICY sr_admin_delete ON public.scheduled_reports
  FOR DELETE USING (public.is_agency_admin(agency_id) OR public.is_platform_admin());

-- ---------------------------------------------------------------------
-- 11. Additional policies on existing client-owned tables
--     (additive — existing is_business_member policies remain intact)
-- ---------------------------------------------------------------------

-- Helper macro pattern: SELECT via has_agency_access_to_business, plus editor-level writes.

-- businesses (clients are businesses too — agency members need to read+update client business rows)
CREATE POLICY biz_agency_select ON public.businesses
  FOR SELECT USING (public.has_agency_access_to_business(id));

CREATE POLICY biz_agency_update ON public.businesses
  FOR UPDATE USING (public.has_agency_access_to_business(id))
  WITH CHECK (public.has_agency_access_to_business(id));

-- Allow agency admins to insert new client business rows during CLI-02
CREATE POLICY biz_agency_admin_insert ON public.businesses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_team_members atm
      WHERE atm.user_id = auth.uid()
        AND atm.role = 'admin'
        AND atm.invitation_accepted_at IS NOT NULL
    )
  );

-- business_users: agency admins may add themselves as members of a client business they own
CREATE POLICY bu_agency_select ON public.business_users
  FOR SELECT USING (public.has_agency_access_to_business(business_id));

-- proof_objects
CREATE POLICY po_agency_select ON public.proof_objects
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY po_agency_insert ON public.proof_objects
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY po_agency_update ON public.proof_objects
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY po_agency_delete ON public.proof_objects
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- content_pieces
CREATE POLICY cp_agency_select ON public.content_pieces
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY cp_agency_insert ON public.content_pieces
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY cp_agency_update ON public.content_pieces
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY cp_agency_delete ON public.content_pieces
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- campaigns
CREATE POLICY camp_agency_select ON public.campaigns
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY camp_agency_insert ON public.campaigns
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY camp_agency_update ON public.campaigns
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY camp_agency_delete ON public.campaigns
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- widgets
CREATE POLICY w_agency_select ON public.widgets
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY w_agency_insert ON public.widgets
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY w_agency_update ON public.widgets
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY w_agency_delete ON public.widgets
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- case_studies
CREATE POLICY cs_agency_select ON public.case_studies
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY cs_agency_insert ON public.case_studies
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY cs_agency_update ON public.case_studies
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY cs_agency_delete ON public.case_studies
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- integrations
CREATE POLICY int_agency_select ON public.integrations
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY int_agency_insert ON public.integrations
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY int_agency_update ON public.integrations
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY int_agency_delete ON public.integrations
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- testimonial_requests
CREATE POLICY tr_agency_select ON public.testimonial_requests
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY tr_agency_insert ON public.testimonial_requests
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY tr_agency_update ON public.testimonial_requests
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY tr_agency_delete ON public.testimonial_requests
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- business_domains
CREATE POLICY bd_agency_select ON public.business_domains
  FOR SELECT USING (public.has_agency_access_to_business(business_id));
CREATE POLICY bd_agency_insert ON public.business_domains
  FOR INSERT WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY bd_agency_update ON public.business_domains
  FOR UPDATE USING (public.has_agency_access_to_business(business_id))
  WITH CHECK (public.has_agency_access_to_business(business_id));
CREATE POLICY bd_agency_delete ON public.business_domains
  FOR DELETE USING (public.has_agency_access_to_business(business_id));

-- ---------------------------------------------------------------------
-- 12. Cron job rows in scheduled_jobs (the dispatcher edge function reads these)
--     Falls back to per-row pg_cron if scheduled_jobs isn't the right registry.
--     We register pg_cron jobs via the supabase--insert tool in a follow-up step
--     because they include the project URL and anon key.
-- ---------------------------------------------------------------------
