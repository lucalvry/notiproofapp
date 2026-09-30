import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email as string | undefined;
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  // Auto-redirect once the user clicks the email link in another tab and a session appears.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) navigate("/onboarding/connect", { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate("/onboarding/connect", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setSending(false);
    toast({
      title: error ? "Failed to resend" : "Email sent",
      description: error?.message ?? "Check your inbox for a verification link.",
      variant: error ? "destructive" : "default",
    });
  };

  return (
    <AuthLayout title="Check your email" subtitle={email ? `We sent a verification link to ${email}` : "We sent you a verification link"}>
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-accent" />
        </div>
        <p className="text-sm text-muted-foreground">
          Click the link in the email to activate your account.
        </p>
        {email && (
          <Button variant="outline" onClick={handleResend} disabled={sending}>
            {sending ? "Sending..." : "Resend email"}
          </Button>
        )}
        <Link to="/login" className="text-sm text-accent hover:underline">Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}
