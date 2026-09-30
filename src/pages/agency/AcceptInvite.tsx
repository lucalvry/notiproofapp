import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type InviteInfo = {
  agency_id: string;
  agency_name: string;
  email: string;
  role: "admin" | "member";
  expires_at: string;
  status: string;
};

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadErr("Missing invitation token.");
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("get_agency_team_invitation", { _token: token });
      if (error) {
        setLoadErr(error.message);
        return;
      }
      const row = (data as InviteInfo[] | null)?.[0];
      if (!row) {
        setLoadErr("Invitation not found.");
        return;
      }
      setInfo(row);
    })();
  }, [token]);

  const accept = async () => {
    if (!info) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("accept_agency_team_invitation", { _token: token });
    setSubmitting(false);
    if (error) {
      setLoadErr(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/agency"), 1200);
  };

  if (loadErr) {
    return (
      <Wrapper>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Invitation problem
            </CardTitle>
            <CardDescription>{loadErr}</CardDescription>
          </CardHeader>
        </Card>
      </Wrapper>
    );
  }

  if (!info || authLoading) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Wrapper>
    );
  }

  const expired = new Date(info.expires_at) < new Date() || info.status !== "pending";

  if (expired) {
    return (
      <Wrapper>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitation no longer valid</CardTitle>
            <CardDescription>
              This invitation has {info.status === "accepted" ? "already been accepted" : "expired or been revoked"}.
              Ask {info.agency_name} to send a new one.
            </CardDescription>
          </CardHeader>
        </Card>
      </Wrapper>
    );
  }

  if (done) {
    return (
      <Wrapper>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" /> You're in!
            </CardTitle>
            <CardDescription>Redirecting you to {info.agency_name}…</CardDescription>
          </CardHeader>
        </Card>
      </Wrapper>
    );
  }

  // Not logged in → ask user to sign up / log in with the invited email.
  if (!user) {
    const next = encodeURIComponent(`/agency/accept-invite?token=${token}`);
    return (
      <Wrapper>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Join {info.agency_name}</CardTitle>
            <CardDescription>
              You've been invited as a <strong>{info.role}</strong>. Sign in or create a NotiProof
              account with <strong>{info.email}</strong> to accept.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link to={`/login?next=${next}`}>Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/register?email=${encodeURIComponent(info.email)}&next=${next}`}>
                Create account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  const emailMatches = (user.email ?? "").toLowerCase() === info.email.toLowerCase();

  return (
    <Wrapper>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Join {info.agency_name}</CardTitle>
          <CardDescription>
            You've been invited as a <strong>{info.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!emailMatches ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              This invitation was sent to <strong>{info.email}</strong>, but you're signed in as{" "}
              <strong>{user.email}</strong>. Sign out and back in with the correct email to accept.
            </div>
          ) : (
            <Button onClick={accept} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Accept invitation
            </Button>
          )}
        </CardContent>
      </Card>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
