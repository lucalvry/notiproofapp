-- Normalize RLS policies to avoid enum type casts in policy expressions
-- Use text-based has_role(auth.uid(), '<role>') to prevent search_path/type resolution issues

-- ALERTS
DROP POLICY IF EXISTS "Admins can view all alerts" ON public.alerts;
CREATE POLICY "Admins can view all alerts"
ON public.alerts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Support can view all alerts" ON public.alerts;
CREATE POLICY "Support can view all alerts"
ON public.alerts
FOR SELECT
USING (has_role(auth.uid(), 'support'));

-- EVENTS
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Admins can view all events"
ON public.events
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Support can view all events" ON public.events;
CREATE POLICY "Support can view all events"
ON public.events
FOR SELECT
USING (has_role(auth.uid(), 'support'));

-- GOALS
DROP POLICY IF EXISTS "Admins can manage all goals" ON public.goals;
CREATE POLICY "Admins can manage all goals"
ON public.goals
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- HELP ARTICLE CATEGORIES
DROP POLICY IF EXISTS "Admins can manage categories" ON public.help_article_categories;
CREATE POLICY "Admins can manage categories"
ON public.help_article_categories
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- HELP ARTICLE FEEDBACK
DROP POLICY IF EXISTS "Admins can manage all feedback" ON public.help_article_feedback;
CREATE POLICY "Admins can manage all feedback"
ON public.help_article_feedback
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- HELP ARTICLE VIEWS
DROP POLICY IF EXISTS "Admins can view all article views" ON public.help_article_views;
CREATE POLICY "Admins can view all article views"
ON public.help_article_views
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- HELP ARTICLES
DROP POLICY IF EXISTS "Admins can manage help articles" ON public.help_articles;
CREATE POLICY "Admins can manage help articles"
ON public.help_articles
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- HELP CATEGORIES
DROP POLICY IF EXISTS "Admins can manage help categories" ON public.help_categories;
CREATE POLICY "Admins can manage help categories"
ON public.help_categories
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- INTEGRATION CONNECTORS
DROP POLICY IF EXISTS "Admins can view all integration connectors" ON public.integration_connectors;
CREATE POLICY "Admins can view all integration connectors"
ON public.integration_connectors
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- INTEGRATION HOOKS
DROP POLICY IF EXISTS "Admins can view all integration hooks" ON public.integration_hooks;
CREATE POLICY "Admins can view all integration hooks"
ON public.integration_hooks
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Support can view all integration hooks" ON public.integration_hooks;
CREATE POLICY "Support can view all integration hooks"
ON public.integration_hooks
FOR SELECT
USING (has_role(auth.uid(), 'support'));

-- ORGANIZATIONS
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
CREATE POLICY "Admins can view all organizations"
ON public.organizations
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- PROFILES
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Support can view all profiles" ON public.profiles;
CREATE POLICY "Support can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'support'));

-- QUICK WIN TEMPLATES
DROP POLICY IF EXISTS "Admins can manage quick-win templates" ON public.quick_win_templates;
CREATE POLICY "Admins can manage quick-win templates"
ON public.quick_win_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- SOCIAL CONNECTORS
DROP POLICY IF EXISTS "Admins can view all connectors" ON public.social_connectors;
CREATE POLICY "Admins can view all connectors"
ON public.social_connectors
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- SOCIAL ITEMS
DROP POLICY IF EXISTS "Admins can view all social items" ON public.social_items;
CREATE POLICY "Admins can view all social items"
ON public.social_items
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- SUBSCRIPTION PLANS
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- TEAM INVITATIONS
DROP POLICY IF EXISTS "Admins can manage all team invitations" ON public.team_invitations;
CREATE POLICY "Admins can manage all team invitations"
ON public.team_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- TEAM MEMBERS
DROP POLICY IF EXISTS "Admins can view all team members" ON public.team_members;
CREATE POLICY "Admins can view all team members"
ON public.team_members
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));
