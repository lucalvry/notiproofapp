import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { appRedirect } from "@/lib/app-url";
import { registerSchema, parseOrError } from "@/lib/validation";
import { Check, X, Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";

function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-gold",
  "bg-accent",
  "bg-success",
];

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailTaken, setEmailTaken] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { toast } = useToast();

  useEffect(() => {
    if (inviteToken) sessionStorage.setItem("notiproof.invite_token", inviteToken);
  }, [inviteToken]);

  const score = useMemo(() => scorePassword(password), [password]);
  const strongEnough = score >= 2 && password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const checkEmail = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailTaken(null);
      return;
    }
    setEmailChecking(true);
    // Use OTP send with shouldCreateUser:false — returns "User not found" when email is unregistered.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setEmailChecking(false);
    if (!error) {
      setEmailTaken(true);
    } else if (/not found|signups? not allowed|invalid/i.test(error.message)) {
      setEmailTaken(false);
    } else {
      setEmailTaken(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseOrError(registerSchema, {
      fullName, businessName, email, password, confirmPassword, agreedToTerms,
    });
    if (parsed.error) {
      toast({ title: "Check your details", description: parsed.error, variant: "destructive" });
      return;
    }
    if (!strongEnough) {
      toast({ title: "Choose a stronger password", description: "Use at least 8 characters with letters and numbers.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const consentTimestamp = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: appRedirect("/dashboard"),
        data: {
          full_name: parsed.data.fullName,
          business_name: parsed.data.businessName,
          terms_accepted_at: consentTimestamp,
          privacy_accepted_at: consentTimestamp,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data.session && data.user) {
      // Try to accept invite immediately if present
      const pendingInvite = sessionStorage.getItem("notiproof.invite_token");
      if (pendingInvite) {
        const { data: businessId, error: inviteErr } = await supabase.rpc("accept_team_invitation" as never, { _token: pendingInvite } as never);
        sessionStorage.removeItem("notiproof.invite_token");
        if (!inviteErr && businessId) {
          localStorage.setItem("notiproof.current_business_id", businessId as string);
          toast({ title: "Invitation accepted" });
          navigate("/dashboard", { replace: true });
          return;
        }
      }
      navigate("/onboarding/connect", { replace: true });
    } else {
      navigate("/verify-email", { state: { email } });
    }
  };

  const handleGoogle = async () => {
    if (!agreedToTerms) {
      toast({ title: "Please accept the Terms & Privacy Policy first", description: "Tick the box below before continuing with Google.", variant: "destructive" });
      return;
    }
    // Persist consent locally so we can stamp it after OAuth callback if needed.
    try {
      localStorage.setItem("notiproof.terms_accepted_at", new Date().toISOString());
    } catch {}
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: appRedirect("/onboarding/connect") },
    });
  };

  const legalFooter = (
    <p>
      Need help?{" "}
      <a href="https://notiproof.com/contact" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
        Contact support
      </a>
    </p>
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start collecting and showing social proof"
      footerSlot={legalFooter}
    >
      {inviteToken && (
        <div className="mb-4 rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
          You've been invited to join a team. Create your account to accept the invitation.
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
        <span className="text-xs text-muted-foreground">OR SIGN UP WITH EMAIL</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Your name</Label>
          <Input id="fullName" required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" required maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              required
              maxLength={254}
              inputMode="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailTaken(null); }}
              onBlur={checkEmail}
              aria-invalid={emailTaken === true}
              autoComplete="email"
            />
            {emailChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            {!emailChecking && emailTaken === false && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />}
            {!emailChecking && emailTaken === true && <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
          </div>
          {emailTaken === true && (
            <p className="text-xs text-destructive">An account with this email already exists. <Link to="/login" className="underline">Sign in instead</Link>.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" required minLength={8} maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn("h-1 flex-1 rounded-full", i < score ? STRENGTH_COLORS[score] : "bg-muted")} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{STRENGTH_LABELS[score]} · 8+ chars, mix of letters, numbers & symbols</p>
            </div>
          )}
          {!password && <p className="text-xs text-muted-foreground">At least 8 characters</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            required
            maxLength={200}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
            autoComplete="new-password"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-destructive">Passwords don't match</p>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(v) => setAgreedToTerms(v === true)}
            className="mt-0.5"
            aria-required
          />
          <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer">
            I agree to NotiProof's{" "}
            <a href="https://notiproof.com/terms-of-service/" target="_blank" rel="noopener noreferrer" className="text-foreground underline hover:text-accent">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="https://notiproof.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-foreground underline hover:text-accent">
              Privacy Policy
            </a>
            , and consent to receive product updates.
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || emailTaken === true || !strongEnough || !passwordsMatch || !agreedToTerms}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
