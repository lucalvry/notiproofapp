import { authErrorMessage } from "@/lib/auth-error";
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useToast } from "@/hooks/use-toast";
import { appRedirect } from "@/lib/app-url";
import { loginSchema, parseOrError } from "@/lib/validation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => localStorage.getItem("notiproof.remember") !== "false");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const inviteToken = searchParams.get("invite");
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  // Persist invite across redirects so it can be accepted after auth
  useEffect(() => {
    if (inviteToken) sessionStorage.setItem("notiproof.invite_token", inviteToken);
  }, [inviteToken]);

  // Surface a toast when redirected here due to inactivity or expired session.
  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "idle") {
      toast({ title: "Signed out", description: "You were signed out due to inactivity." });
    } else if (reason === "expired") {
      toast({ title: "Session expired", description: "Please sign in again to continue." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostAuth = async (userId: string) => {
    // Try to accept any pending invite
    const pendingInvite = sessionStorage.getItem("notiproof.invite_token");
    if (pendingInvite) {
      const { data: businessId, error: inviteErr } = await supabase.rpc("accept_team_invitation" as never, { _token: pendingInvite } as never);
      sessionStorage.removeItem("notiproof.invite_token");
      if (!inviteErr && businessId) {
        localStorage.setItem("notiproof.current_business_id", businessId as string);
        toast({ title: "Invitation accepted", description: "You've joined the team." });
        navigate("/dashboard", { replace: true });
        return;
      }
      if (inviteErr) {
        toast({ title: "Invite could not be accepted", description: inviteErr.message, variant: "destructive" });
      }
    }

    // Agency users: route to /agency before checking business memberships
    const { data: agencyMembership } = await supabase
      .from("agency_team_members")
      .select("agency_id")
      .eq("user_id", userId)
      .not("invitation_accepted_at", "is", null)
      .limit(1)
      .maybeSingle();
    if (agencyMembership?.agency_id) {
      navigate("/agency", { replace: true });
      return;
    }

    // Spec login routing: check business onboarding + suspension
    const { data: memberships } = await supabase
      .from("business_users")
      .select("business_id, businesses(id, onboarding_completed, suspended_at, account_type)")
      .eq("user_id", userId);

    const rows = (memberships ?? []).map((m: any) => m.businesses).filter(Boolean);
    if (rows.length === 0) {
      navigate("/onboarding/connect", { replace: true });
      return;
    }
    const allSuspended = rows.every((b: any) => !!b.suspended_at);
    if (allSuspended) {
      navigate("/suspended", { replace: true });
      return;
    }

    // Client-account routing: redirect to white-label portal of owning agency.
    const clientBusiness = rows.find((b: any) => b.account_type === "client" && !b.suspended_at);
    if (clientBusiness) {
      const { data: rel } = await supabase
        .from("agency_client_relationships")
        .select("agency_id, agencies(portal_slug, slug, custom_subdomain, subdomain_verified)")
        .eq("client_business_id", clientBusiness.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      const ag = (rel as any)?.agencies;
      if (ag) {
        if (ag.custom_subdomain && ag.subdomain_verified) {
          window.location.href = `https://${ag.custom_subdomain}`;
          return;
        }
        navigate(`/portal/${ag.portal_slug || ag.slug}`, { replace: true });
        return;
      }
    }

    const needsOnboarding = rows.some((b: any) => !b.onboarding_completed && !b.suspended_at);
    navigate(needsOnboarding ? "/onboarding/connect" : from, { replace: true });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseOrError(loginSchema, { email, password });
    if (parsed.error) {
      toast({ title: "Check your details", description: parsed.error, variant: "destructive" });
      return;
    }
    // Persist the "Remember me" preference BEFORE sign-in so the storage adapter
    // picks the right place to save the session.
    localStorage.setItem("notiproof.remember", remember ? "true" : "false");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: authErrorMessage(error), variant: "destructive" });
      return;
    }
    if (data.user) await handlePostAuth(data.user.id);
  };

  const handleGoogle = async () => {
    localStorage.setItem("notiproof.remember", remember ? "true" : "false");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: appRedirect("/dashboard") },
    });
  };

  const legalFooter = (
    <p>
      By continuing you agree to our{" "}
      <a href="https://notiproof.xyz/terms-of-service/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
        Terms of Service
      </a>{" "}
      and{" "}
      <a href="https://notiproof.xyz/privacy-policy/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
        Privacy Policy
      </a>
      .
    </p>
  );

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your NotiProof account" footerSlot={legalFooter}>
      {inviteToken && (
        <div className="mb-4 rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
          You've been invited to join a team. Sign in to accept the invitation.
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={handleGoogle} type="button">
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR SIGN IN WITH EMAIL</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="password" required maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            <span className="text-foreground/80">Remember me for 30 days</span>
          </label>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to={inviteToken ? `/register?invite=${inviteToken}` : "/register"} className="text-accent font-medium hover:underline">
          Create one for free
        </Link>
      </p>
    </AuthLayout>
  );
}
