import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function AgencySettings() {
  const { agency, role, refresh } = useAgency();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#2563eb");
  const [portalSlug, setPortalSlug] = useState("");
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [portalWelcome, setPortalWelcome] = useState("");
  const [clientSelfLogin, setClientSelfLogin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);

  useEffect(() => {
    if (!agency) return;
    setName(agency.name);
    setBrandColor(agency.brand_color ?? "#2563eb");
    setPortalSlug(agency.portal_slug ?? "");
    setCustomSubdomain(agency.custom_subdomain ?? "");
    setPortalWelcome(agency.portal_welcome_msg ?? "");
    setClientSelfLogin(agency.client_self_login);
  }, [agency]);

  if (!agency) return null;

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    const { error } = await supabase.from("agencies").update(patch as never).eq("id", agency.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    await refresh();
    toast({ title: "Saved" });
  };

  const verifyDns = async () => {
    if (!customSubdomain.trim()) {
      toast({ title: "Enter a subdomain first", variant: "destructive" });
      return;
    }
    setVerifyingDns(true);
    const { data, error } = await supabase.functions.invoke("verify-subdomain", {
      body: { agency_id: agency.id, subdomain: customSubdomain.trim() },
    });
    setVerifyingDns(false);
    if (error) {
      toast({ title: "DNS check failed", description: error.message, variant: "destructive" });
      return;
    }
    if ((data as any)?.verified) {
      toast({ title: "Subdomain verified", description: "Your custom domain is live." });
      await refresh();
    } else {
      toast({
        title: "Not verified yet",
        description: (data as any)?.message ?? "CNAME not pointing to NotiProof yet.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your agency profile, branding, and account.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/agency/settings/preview">Preview portal</a>
        </Button>
      </div>


      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="portal">Portal</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Agency profile</CardTitle>
              <CardDescription>Basic information about your agency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ag-name">Agency name</Label>
                <Input id="ag-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ag-website">Website</Label>
                <Input id="ag-website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} disabled={!isAdmin} placeholder="https://acme.com" />
              </div>
              <Button onClick={() => save({ name, website_url: websiteUrl || null })} disabled={!isAdmin || saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Colors and visual identity for your client portal.</CardDescription>
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
                    disabled={!isAdmin}
                    className="h-10 w-16 rounded border cursor-pointer disabled:opacity-50"
                  />
                  <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} disabled={!isAdmin} className="font-mono w-32" />
                  <div
                    className="ml-auto h-10 px-4 rounded flex items-center text-sm font-medium text-white"
                    style={{ background: brandColor }}
                  >
                    Preview
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground rounded-md border bg-secondary/40 p-3">
                Logo upload coming soon. Use your agency portal slug in the meantime.
              </div>
              <Button onClick={() => save({ brand_color: brandColor })} disabled={!isAdmin || saving}>
                {saving ? "Saving…" : "Save branding"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal">
          <Card>
            <CardHeader>
              <CardTitle>Client portal</CardTitle>
              <CardDescription>Configure how clients access their portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="ag-slug">Portal slug</Label>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground whitespace-nowrap">notiproof.xyz/portal/</span>
                  <Input
                    id="ag-slug"
                    value={portalSlug}
                    onChange={(e) => setPortalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ag-cname">Custom subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ag-cname"
                    value={customSubdomain}
                    onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().trim())}
                    placeholder="proof.acme.com"
                    disabled={!isAdmin}
                  />
                  <Button variant="outline" onClick={verifyDns} disabled={!isAdmin || verifyingDns}>
                    {verifyingDns ? "Checking…" : agency.subdomain_verified ? "Re-verify" : "Verify DNS"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Point a CNAME record from your subdomain to <code className="px-1 bg-secondary rounded">portal.notiproof.xyz</code>.{" "}
                  {agency.subdomain_verified ? (
                    <span className="text-emerald-600 font-medium">Verified ✓</span>
                  ) : (
                    <span>DNS changes can take up to 48 hours.</span>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ag-welcome">Portal welcome message</Label>
                <Input id="ag-welcome" value={portalWelcome} onChange={(e) => setPortalWelcome(e.target.value)} disabled={!isAdmin} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Allow clients to log in directly</div>
                  <div className="text-xs text-muted-foreground">If off, clients can only be managed by your team.</div>
                </div>
                <Switch checked={clientSelfLogin} onCheckedChange={setClientSelfLogin} disabled={!isAdmin} />
              </div>
              <Button
                onClick={() =>
                  save({
                    portal_slug: portalSlug || null,
                    custom_subdomain: customSubdomain || null,
                    portal_welcome_msg: portalWelcome || null,
                    client_self_login: clientSelfLogin,
                  })
                }
                disabled={!isAdmin || saving}
              >
                {saving ? "Saving…" : "Save portal settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Current plan: <span className="font-medium capitalize">{agency.plan_tier.replace("_agency", "")}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                You're using {/* placeholder seats */}<strong>—</strong> of <strong>{agency.client_seat_limit}</strong> client seats included in your plan.
              </div>
              <div className="rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground">
                Stripe-powered billing portal arrives in Sprint 5. For now, contact support to change your plan.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose when we email you.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground">
                Notification preferences arrive in Sprint 6 alongside team management.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}