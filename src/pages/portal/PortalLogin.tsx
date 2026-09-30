import { useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalBranding } from "@/contexts/PortalBrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function PortalLogin() {
  const { agency } = usePortalBranding();
  const params = useParams<{ agency_slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!agency) return null;
  const slug = params.agency_slug || agency.portal_slug || agency.slug;
  const brand = agency.brand_color || "#2563eb";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
      return;
    }
    const from = (location.state as any)?.from || `/portal/${slug}`;
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div
            className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
            style={{ background: brand }}
          >
            {agency.logo_url ? (
              <img src={agency.logo_url} alt={agency.name} className="h-12 w-12 object-contain" />
            ) : (
              agency.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <CardTitle>Sign in to {agency.name}</CardTitle>
          {agency.portal_welcome_msg ? (
            <CardDescription>{agency.portal_welcome_msg}</CardDescription>
          ) : (
            <CardDescription>Access your client portal</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  to={`/portal/${slug}/forgot-password`}
                  className="text-xs hover:underline"
                  style={{ color: brand }}
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={busy}
              style={{ background: brand, color: "#fff" }}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function PortalForgotPassword() {
  const { agency } = usePortalBranding();
  const params = useParams<{ agency_slug: string }>();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!agency) return null;
  const slug = params.agency_slug || agency.portal_slug || agency.slug;
  const brand = agency.brand_color || "#2563eb";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/portal/${slug}/login`,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            We'll email you a link to reset your password for {agency.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-3 text-sm">
              <p>Check your inbox for a password-reset link.</p>
              <Button asChild variant="outline">
                <Link to={`/portal/${slug}/login`}>Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={busy}
                style={{ background: brand, color: "#fff" }}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
