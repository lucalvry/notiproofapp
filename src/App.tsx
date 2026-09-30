import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layouts/AppLayout";
import { WizardLayout } from "@/components/layouts/WizardLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Sentry } from "@/lib/sentry";
import { PostHogPageviewTracker } from "@/components/analytics/PostHogPageviewTracker";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Suspended from "./pages/auth/Suspended";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";

import OnbConnect from "./pages/onboarding/Connect";
import OnbInstall from "./pages/onboarding/Install";
import OnbWidget from "./pages/onboarding/Widget";
import OnbComplete from "./pages/onboarding/Complete";

import ProofLibrary from "./pages/proof/ProofLibrary";
import ProofDetail from "./pages/proof/ProofDetail";
import ProofRequests from "./pages/proof/ProofRequests";

import WidgetsList from "./pages/widgets/WidgetsList";
import WidgetEditor from "./pages/widgets/WidgetEditor";

import IntegrationsList from "./pages/integrations/IntegrationsList";
import IntegrationDetail from "./pages/integrations/IntegrationDetail";

import Analytics from "./pages/Analytics";

import ContentHub from "./pages/content/ContentHub";
import ContentGenerator from "./pages/content/ContentGenerator";
import ContentEditor from "./pages/content/ContentEditor";
import BulkReview from "./pages/content/BulkReview";
import PublishingCalendar from "./pages/content/PublishingCalendar";
import ChannelsHub from "./pages/content/ChannelsHub";
import PublishingAnalytics from "./pages/content/PublishingAnalytics";

import CampaignsList from "./pages/campaigns/CampaignsList";
import CampaignBuilder from "./pages/campaigns/CampaignBuilder";
import CampaignDetail from "./pages/campaigns/CampaignDetail";

import CaseStudiesList from "./pages/case-studies/CaseStudiesList";
import CaseStudyGenerator from "./pages/case-studies/CaseStudyGenerator";
import CaseStudyEditor from "./pages/case-studies/CaseStudyEditor";

import ProfileSettings, { SettingsLayout } from "./pages/settings/Profile";
import AccountSettings from "./pages/settings/Account";
import TeamSettings from "./pages/settings/Team";
import EmailSettings from "./pages/settings/Email";
import BillingSettings from "./pages/settings/Billing";
import BrandVoiceSettings from "./pages/settings/BrandVoice";

import ContentPreferences from "./pages/settings/ContentPreferences";

import Collect, { CollectThanks } from "./pages/collect/Collect";

import AdminOverview from "./pages/admin/Overview";
import AdminBusinesses from "./pages/admin/Businesses";
import BusinessDetail from "./pages/admin/BusinessDetail";
import Moderation from "./pages/admin/Moderation";
import Health from "./pages/admin/Health";

import { AgencyLayout } from "@/components/layouts/AgencyLayout";
import AgencySignup from "./pages/agency/Signup";
import AgencyDashboard from "./pages/agency/Dashboard";
import AgencySettings from "./pages/agency/Settings";
import AgencySettingsPreview from "./pages/agency/SettingsPreview";
import ClientsList from "./pages/agency/ClientsList";
import ClientsNew from "./pages/agency/ClientsNew";
import ClientWorkspace from "./pages/agency/ClientWorkspace";
import ClientManage from "./pages/agency/ClientManage";
import AgencyTeam from "./pages/agency/Team";
import AcceptInvite from "./pages/agency/AcceptInvite";
import AgencyReports from "./pages/agency/Reports";
import ClientReport from "./pages/agency/ClientReport";
import ReportsSchedule from "./pages/agency/ReportsSchedule";
import AgencyBilling from "./pages/agency/Billing";
import AgencyReseller from "./pages/agency/Reseller";

import { PortalLayout } from "@/components/layouts/PortalLayout";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalProof from "./pages/portal/PortalProof";
import PortalContent from "./pages/portal/PortalContent";
import PortalAnalytics from "./pages/portal/PortalAnalytics";
import PortalLogin, { PortalForgotPassword } from "./pages/portal/PortalLogin";

import WatchIndex, { WatchAudience } from "./pages/Watch";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PostHogPageviewTracker />
        <Sentry.ErrorBoundary
          fallback={({ resetError }) => (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
              <div className="max-w-md space-y-3">
                <h1 className="text-xl font-semibold">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">
                  The error has been reported. You can try again or reload the page.
                </p>
                <button
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                  onClick={() => resetError()}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        >
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/suspended" element={<Suspended />} />

          {/* Public explainer videos */}
          <Route path="/watch" element={<WatchIndex />} />
          <Route path="/watch/:audience" element={<WatchAudience />} />

          {/* Agency signup (no layout) */}
          <Route path="/agency/signup" element={<AgencySignup />} />
          <Route path="/agency/accept-invite" element={<AcceptInvite />} />

          {/* Agency portal */}
          <Route element={<AgencyLayout />}>
            <Route path="/agency" element={<AgencyDashboard />} />
            <Route path="/agency/clients" element={<ClientsList />} />
            <Route path="/agency/clients/new" element={<ClientsNew />} />
            <Route path="/agency/clients/:client_id" element={<ClientWorkspace />} />
            <Route path="/agency/clients/:client_id/manage" element={<ClientManage />} />
            <Route path="/agency/clients/:client_id/report" element={<ClientReport />} />

            <Route path="/agency/team" element={<AgencyTeam />} />
            <Route path="/agency/reports" element={<AgencyReports />} />
            <Route path="/agency/reports/schedule" element={<ReportsSchedule />} />
            <Route path="/agency/billing" element={<AgencyBilling />} />
            <Route path="/agency/billing/reseller" element={<AgencyReseller />} />
            <Route path="/agency/settings" element={<AgencySettings />} />
            <Route path="/agency/settings/preview" element={<AgencySettingsPreview />} />
          </Route>

          {/* White-label client portal (Sprint 3 fills this in) */}
          {/* White-label client portal */}
          <Route path="/portal/:agency_slug" element={<PortalLayout />}>
            <Route index element={<PortalDashboard />} />
            <Route path="login" element={<PortalLogin />} />
            <Route path="forgot-password" element={<PortalForgotPassword />} />
            <Route path="proof" element={<PortalProof />} />
            <Route path="content" element={<PortalContent />} />
            <Route path="analytics" element={<PortalAnalytics />} />
          </Route>


          {/* Public collection */}
          <Route path="/collect/:token" element={<Collect />} />
          <Route path="/collect/:token/done" element={<CollectThanks />} />

          {/* Onboarding */}
          <Route element={<WizardLayout />}>
            <Route path="/onboarding/connect" element={<OnbConnect />} />
            <Route path="/onboarding/install" element={<OnbInstall />} />
            <Route path="/onboarding/preview" element={<OnbWidget />} />
            <Route path="/onboarding/complete" element={<OnbComplete />} />
          </Route>

          {/* Authenticated app */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/proof" element={<ProofLibrary />} />
            <Route path="/proof/request" element={<ProofRequests />} />
            <Route path="/proof/:id" element={<ProofDetail />} />

            <Route path="/widgets" element={<WidgetsList />} />
            <Route path="/widgets/new" element={<WidgetEditor />} />
            <Route path="/widgets/:id/edit" element={<WidgetEditor />} />

            <Route path="/content" element={<ContentHub />} />
            <Route path="/content/generate/:proof_id" element={<ContentGenerator />} />
            <Route path="/content/review" element={<BulkReview />} />
            <Route path="/content/calendar" element={<PublishingCalendar />} />
            <Route path="/content/channels" element={<ChannelsHub />} />
            <Route path="/content/analytics" element={<PublishingAnalytics />} />
            <Route path="/content/:id/edit" element={<ContentEditor />} />

            <Route path="/campaigns" element={<CampaignsList />} />
            <Route path="/campaigns/new" element={<CampaignBuilder />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/campaigns/:id/edit" element={<CampaignBuilder />} />

            <Route path="/case-studies" element={<CaseStudiesList />} />
            <Route path="/case-studies/generate" element={<CaseStudyGenerator />} />
            <Route path="/case-studies/:id/edit" element={<CaseStudyEditor />} />

            <Route path="/integrations" element={<IntegrationsList />} />
            <Route path="/integrations/:id" element={<IntegrationDetail />} />

            <Route path="/analytics" element={<Analytics />} />

            <Route element={<SettingsLayout />}>
              <Route path="/settings" element={<ProfileSettings />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/account" element={<AccountSettings />} />
              <Route path="/settings/team" element={<TeamSettings />} />
              <Route path="/settings/email" element={<EmailSettings />} />
              <Route path="/settings/brand-voice" element={<BrandVoiceSettings />} />
              <Route path="/settings/channels" element={<Navigate to="/content/channels" replace />} />
              <Route path="/settings/content" element={<ContentPreferences />} />
              <Route path="/settings/billing" element={<BillingSettings />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/dashboard" element={<AdminOverview />} />
            <Route path="/admin/businesses" element={<AdminBusinesses />} />
            <Route path="/admin/businesses/:id" element={<BusinessDetail />} />
            <Route path="/admin/moderation" element={<Moderation />} />
            <Route path="/admin/health" element={<Health />} />
            <Route path="/admin/system" element={<Navigate to="/admin/dashboard?tab=system" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Sentry.ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
