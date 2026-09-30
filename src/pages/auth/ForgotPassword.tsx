import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { appRedirect } from "@/lib/app-url";
import { forgotPasswordSchema, parseOrError } from "@/lib/validation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseOrError(forgotPasswordSchema, { email });
    if (parsed.error) {
      toast({ title: "Check your email", description: parsed.error, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: appRedirect("/reset-password"),
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout title="Reset your password" subtitle={sent ? "Check your email" : "We'll send you a reset link"}>
      {sent ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">If an account exists for {email}, a reset link is on its way.</p>
          <Link to="/login" className="text-sm text-accent hover:underline block">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required maxLength={254} inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
