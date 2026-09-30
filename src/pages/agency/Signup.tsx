import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Building2, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { VideoBadgeLink } from "@/components/video/YouTubeEmbed";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const PLANS = [
  { id: "starter_agency", name: "Starter", price: "$199/mo", seats: 5, tag: "5 client seats" },
  { id: "growth_agency", name: "Growth", price: "$499/mo", seats: 15, tag: "15 client seats", popular: true },
  { id: "scale_agency", name: "Scale", price: "$999/mo", seats: 40, tag: "40 client seats" },
];

export default function AgencySignup() {
  const { user, loading: authLoading } = useAuth();
  const { agency, loading: agencyLoading, refresh } = useAgency();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [agencyType, setAgencyType] = useState("");
  const [brandColor, setBrandColor] = useState("#2563eb");
  const [portalWelcome, setPortalWelcome] = useState("");
  const [planId, setPlanId] = useState<string>("growth_agency");

  useEffect(() => {
    if (name && !slug) setSlug(slugify(name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (authLoading || agencyLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (agency) return <Navigate to="/agency" replace />;

  const validateStep1 = () => {
    if (!name.trim()) {
      toast({ title: "Agency name required", variant: "destructive" });
      return false;
    }
    if (!slug.match(/^[a-z0-9-]+$/)) {
      toast({ title: "Invalid slug", description: "Use lowercase letters, numbers, dashes only.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const createAgency = async () => {
    setSubmitting(true);

    // 1. Create the agency row
    const { data: ag, error: agErr } = await supabase
      .from("agencies")
      .insert({
        name: name.trim(),
        slug,
        portal_slug: slug,
        website_url: websiteUrl.trim() || null,
        agency_type: agencyType.trim() || null,
        brand_color: brandColor,
        portal_welcome_msg: portalWelcome.trim() || null,
        plan_tier: planId,
        owner_user_id: user.id,
      })
      .select()
      .single();

    if (agErr || !ag) {
      setSubmitting(false);
      toast({
        title: "Couldn't create agency",
        description: agErr?.message ?? "Slug may already be taken.",
        variant: "destructive",
      });
      return;
    }

    // 2. Insert founding admin team member row
    const { error: tmErr } = await supabase.from("agency_team_members").insert({
      agency_id: ag.id,
      user_id: user.id,
      role: "admin",
      invitation_accepted_at: new Date().toISOString(),
    });

    if (tmErr) {
      setSubmitting(false);
      toast({ title: "Couldn't add founder membership", description: tmErr.message, variant: "destructive" });
      return;
    }

    // 3. Link users.agency_id
    await supabase.from("users").update({ agency_id: ag.id }).eq("id", user.id);

    await refresh();
    setSubmitting(false);
    toast({ title: "Agency created", description: "Welcome to NotiProof Agency OS." });
    navigate("/agency", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Set up your agency</h1>
          <p className="text-muted-foreground mt-1">Manage social proof across all your clients from one place.</p>
          <div className="mt-3 flex justify-center"><VideoBadgeLink audience="agency" label="Watch the 90-second tour" /></div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === n
                    ? "bg-primary text-primary-foreground"
                    : step > n
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 3 && <div className={`w-12 h-px ${step > n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Agency details</CardTitle>
                <CardDescription>Tell us about your agency.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ag-name">Agency name *</Label>
                  <Input id="ag-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Marketing" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ag-slug">Portal slug *</Label>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">notiproof.xyz/portal/</span>
                    <Input id="ag-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="acme" />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for your client portal URL. Change later in settings.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ag-website">Website</Label>
                    <Input id="ag-website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://acme.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ag-type">Agency type</Label>
                    <Input id="ag-type" value={agencyType} onChange={(e) => setAgencyType(e.target.value)} placeholder="Marketing, PR..." />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>White-label your client portal. You can change everything later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ag-color">Brand color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="ag-color"
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="font-mono w-32" />
                    <div
                      className="ml-auto h-10 px-4 rounded flex items-center text-sm font-medium text-white"
                      style={{ background: brandColor }}
                    >
                      Preview
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ag-welcome">Portal welcome message</Label>
                  <Input
                    id="ag-welcome"
                    value={portalWelcome}
                    onChange={(e) => setPortalWelcome(e.target.value)}
                    placeholder="Welcome to your proof portal — let's make your customers your loudest advocates."
                  />
                  <p className="text-xs text-muted-foreground">Shown to clients when they first log in.</p>
                </div>
                <div className="rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>Logo upload and custom subdomain are configurable from <strong>Settings → Branding</strong> after signup.</div>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Choose your plan</CardTitle>
                <CardDescription>Start with a 14-day trial. Switch plans anytime.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {PLANS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlanId(p.id)}
                      className={`text-left rounded-lg border-2 p-4 transition-colors ${
                        planId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{p.name}</span>
                            {p.popular && (
                              <span className="text-[10px] uppercase tracking-wider rounded-full bg-primary/10 text-primary px-2 py-0.5">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{p.tag}</div>
                        </div>
                        <div className="text-lg font-bold">{p.price}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Billing is configured after signup in <strong>Settings → Billing</strong>. No card required to start.
                </p>
              </CardContent>
            </>
          )}

          <div className="border-t p-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((Math.max(1, step - 1)) as 1 | 2 | 3)}
              disabled={step === 1 || submitting}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 1 && !validateStep1()) return;
                  setStep((Math.min(3, step + 1)) as 1 | 2 | 3);
                }}
                className="gap-1"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={createAgency} disabled={submitting} className="gap-1">
                {submitting ? "Creating…" : "Create agency"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}