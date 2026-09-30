
-- ============================================================
-- 1. DROP EVERYTHING (clean slate, public schema only)
-- ============================================================
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as args FROM pg_proc INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid) WHERE ns.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
    END LOOP;
    FOR r IN (SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Drop our trigger on auth.users if it exists from a prior run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================
-- 2. ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.proof_type AS ENUM ('testimonial', 'review', 'purchase', 'signup', 'visitor_count', 'custom');
CREATE TYPE public.proof_status AS ENUM ('pending', 'approved', 'rejected', 'archived');
CREATE TYPE public.integration_provider AS ENUM ('stripe', 'shopify', 'woocommerce', 'gumroad', 'webhook', 'zapier', 'google_reviews', 'trustpilot', 'plaid', 'wordpress');
CREATE TYPE public.integration_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
CREATE TYPE public.widget_type AS ENUM ('popup', 'banner', 'inline', 'wall');
CREATE TYPE public.widget_status AS ENUM ('draft', 'active', 'paused');
CREATE TYPE public.testimonial_request_status AS ENUM ('pending', 'sent', 'completed', 'expired');

-- ============================================================
-- 3. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- ============================================================
-- 4. TABLES
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);
CREATE INDEX idx_business_users_business ON public.business_users(business_id);
CREATE INDEX idx_business_users_user ON public.business_users(user_id);

CREATE TABLE public.proof_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type public.proof_type NOT NULL,
  status public.proof_status NOT NULL DEFAULT 'pending',
  author_name TEXT,
  author_email TEXT,
  author_avatar_url TEXT,
  content TEXT,
  rating SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  media_url TEXT,
  media_type TEXT,
  source TEXT,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proof_business_status_created ON public.proof_objects(business_id, status, created_at DESC);
CREATE TRIGGER trg_proof_updated BEFORE UPDATE ON public.proof_objects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.testimonial_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  proof_object_id UUID REFERENCES public.proof_objects(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.testimonial_request_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_treq_business ON public.testimonial_requests(business_id);
CREATE INDEX idx_treq_token ON public.testimonial_requests(token);
CREATE TRIGGER trg_treq_updated BEFORE UPDATE ON public.testimonial_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  status public.integration_status NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_integrations_business ON public.integrations(business_id);
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  proof_object_id UUID REFERENCES public.proof_objects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_intevents_integration_received ON public.integration_events(integration_id, received_at DESC);
CREATE INDEX idx_intevents_business ON public.integration_events(business_id);

CREATE TABLE public.widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.widget_type NOT NULL DEFAULT 'popup',
  status public.widget_status NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_widgets_business ON public.widgets(business_id);
CREATE TRIGGER trg_widgets_updated BEFORE UPDATE ON public.widgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.widget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  proof_object_id UUID REFERENCES public.proof_objects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  visitor_id TEXT,
  page_url TEXT,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_widgetevents_widget_fired ON public.widget_events(widget_id, fired_at DESC);
CREATE INDEX idx_widgetevents_business ON public.widget_events(business_id);

-- ============================================================
-- 5. SECURITY DEFINER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_business_member(_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = _business_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_business_role(_business_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = _business_id
      AND user_id = auth.uid()
      AND (
        role = _role
        OR (_role = 'viewer' AND role IN ('editor','owner'))
        OR (_role = 'editor' AND role = 'owner')
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), false)
$$;

-- ============================================================
-- 6. NEW USER TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_business_id UUID;
  biz_name TEXT;
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  biz_name := COALESCE(NEW.raw_user_meta_data->>'business_name', split_part(NEW.email, '@', 1) || '''s Business');
  INSERT INTO public.businesses (name) VALUES (biz_name) RETURNING id INTO new_business_id;

  INSERT INTO public.business_users (business_id, user_id, role) VALUES (new_business_id, NEW.id, 'owner');

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. ENABLE RLS + POLICIES
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonial_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_self_select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "users_self_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users_admin_all" ON public.users FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "biz_member_select" ON public.businesses FOR SELECT TO authenticated USING (public.is_business_member(id) OR public.is_platform_admin());
CREATE POLICY "biz_owner_update" ON public.businesses FOR UPDATE TO authenticated USING (public.has_business_role(id, 'owner') OR public.is_platform_admin());
CREATE POLICY "biz_owner_delete" ON public.businesses FOR DELETE TO authenticated USING (public.has_business_role(id, 'owner') OR public.is_platform_admin());
CREATE POLICY "biz_admin_insert" ON public.businesses FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

CREATE POLICY "bu_member_select" ON public.business_users FOR SELECT TO authenticated USING (public.is_business_member(business_id) OR public.is_platform_admin());
CREATE POLICY "bu_owner_insert" ON public.business_users FOR INSERT TO authenticated WITH CHECK (public.has_business_role(business_id, 'owner') OR public.is_platform_admin());
CREATE POLICY "bu_owner_update" ON public.business_users FOR UPDATE TO authenticated USING (public.has_business_role(business_id, 'owner') OR public.is_platform_admin());
CREATE POLICY "bu_owner_delete" ON public.business_users FOR DELETE TO authenticated USING (public.has_business_role(business_id, 'owner') OR public.is_platform_admin());

CREATE POLICY "proof_member_select" ON public.proof_objects FOR SELECT TO authenticated USING (public.is_business_member(business_id) OR public.is_platform_admin());
CREATE POLICY "proof_editor_insert" ON public.proof_objects FOR INSERT TO authenticated WITH CHECK (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "proof_editor_update" ON public.proof_objects FOR UPDATE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "proof_editor_delete" ON public.proof_objects FOR DELETE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());

CREATE POLICY "treq_member_select" ON public.testimonial_requests FOR SELECT TO authenticated USING (public.is_business_member(business_id) OR public.is_platform_admin());
CREATE POLICY "treq_editor_insert" ON public.testimonial_requests FOR INSERT TO authenticated WITH CHECK (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "treq_editor_update" ON public.testimonial_requests FOR UPDATE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "treq_editor_delete" ON public.testimonial_requests FOR DELETE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());

CREATE POLICY "int_member_select" ON public.integrations FOR SELECT TO authenticated USING (public.is_business_member(business_id) OR public.is_platform_admin());
CREATE POLICY "int_editor_insert" ON public.integrations FOR INSERT TO authenticated WITH CHECK (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "int_editor_update" ON public.integrations FOR UPDATE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "int_editor_delete" ON public.integrations FOR DELETE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());

CREATE POLICY "intev_member_select" ON public.integration_events FOR SELECT TO authenticated USING (public.is_business_member(business_id) OR public.is_platform_admin());

CREATE POLICY "wid_member_select" ON public.widgets FOR SELECT TO authenticated USING (public.is_business_member(business_id) OR public.is_platform_admin());
CREATE POLICY "wid_editor_insert" ON public.widgets FOR INSERT TO authenticated WITH CHECK (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "wid_editor_update" ON public.widgets FOR UPDATE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());
CREATE POLICY "wid_editor_delete" ON public.widgets FOR DELETE TO authenticated USING (public.has_business_role(business_id, 'editor') OR public.is_platform_admin());

CREATE POLICY "widev_member_select" ON public.widget_events FOR SELECT TO authenticated USING (public.is_business_member(business_id) OR public.is_platform_admin());

-- ============================================================
-- 8. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('logos', 'logos', true),
  ('avatars', 'avatars', true),
  ('proof-media', 'proof-media', true),
  ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public buckets readable" ON storage.objects FOR SELECT
  USING (bucket_id IN ('logos','avatars','proof-media'));

CREATE POLICY "Auth upload logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth upload proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proof-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth upload videos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Auth update own files" ON storage.objects FOR UPDATE TO authenticated
  USING ((storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth delete own files" ON storage.objects FOR DELETE TO authenticated
  USING ((storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner reads own private videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
