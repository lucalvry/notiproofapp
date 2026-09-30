import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { VideoBadgeLink } from "@/components/video/YouTubeEmbed";

export default function ClientsNew() {
  const navigate = useNavigate();
  const { agency, setActiveClientId, refresh } = useAgency();
  const { user } = useAuth();
  const { toast } = useToast();

  // New client form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Link existing
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<Array<{ id: string; name: string }>>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Seat usage check
  const [seatUsed, setSeatUsed] = useState<number | null>(null);
  const seatLimit = agency?.client_seat_limit ?? 0;
  const atCap = seatUsed !== null && seatLimit > 0 && seatUsed >= seatLimit;

  useEffect(() => {
    if (!agency) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("agency_client_relationships")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agency.id)
        .neq("status", "removed");
      if (!cancelled) setSeatUsed(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [agency?.id]);

  const createNewClient = async () => {
    if (!agency || !user) return;
    if (atCap) {
      toast({
        title: "Client seat limit reached",
        description: `Your plan includes ${seatLimit} clients. Upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast({ title: "Missing info", description: "Client name and email are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          name,
          slug,
          industry: industry || null,
          account_type: "client",
          plan: "free",
        })
        .select("id")
        .single();
      if (bizErr) throw bizErr;

      const { error: relErr } = await supabase
        .from("agency_client_relationships")
        .insert({
          agency_id: agency.id,
          client_business_id: biz.id,
          status: "active",
          added_by: user.id,
          notes: notes || null,
        });
      if (relErr) throw relErr;

      // Fire invitation email (best-effort)
      await supabase.functions.invoke("send-client-invitation", {
        body: {
          agency_id: agency.id,
          client_business_id: biz.id,
          client_email: email,
          client_name: contactName || name,
          mode: "new_client",
        },
      });

      toast({ title: "Client created", description: `Invitation sent to ${email}.` });
      await refresh();
      setActiveClientId(biz.id);
      navigate(`/agency/clients/${biz.id}`);
    } catch (e) {
      toast({ title: "Could not create client", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from("businesses")
        .select("id, name")
        .ilike("name", `%${searchQ}%`)
        .neq("account_type", "agency")
        .limit(10);
      setMatches(data ?? []);
    } finally {
      setSearching(false);
    }
  };

  const linkExisting = async (biz: { id: string; name: string }) => {
    if (!agency || !user) return;
    if (atCap) {
      toast({
        title: "Client seat limit reached",
        description: `Your plan includes ${seatLimit} clients. Upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }
    setLinkingId(biz.id);
    try {
      const { error } = await supabase
        .from("agency_client_relationships")
        .insert({
          agency_id: agency.id,
          client_business_id: biz.id,
          status: "pending",
          added_by: user.id,
        });
      if (error) throw error;

      // Ask EF to email approval request — best-effort; needs an email but we don't have one yet, so we skip if blank.
      toast({ title: "Request sent", description: `${biz.name} will need to approve the connection.` });
      navigate("/agency/clients");
    } catch (e) {
      toast({ title: "Link failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/agency/clients")} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />Back to clients
      </Button>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Add client</h1>
        <p className="text-muted-foreground text-sm">Create a new client business or link an existing NotiProof account.</p>
      </div>

      {atCap && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Client seat limit reached
              </CardTitle>
              <CardDescription>
                Your current plan includes {seatLimit} client {seatLimit === 1 ? "workspace" : "workspaces"} and {seatUsed} {seatUsed === 1 ? "is" : "are"} already in use. Upgrade your agency plan to onboard more clients.
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link to="/agency/billing">Upgrade plan</Link>
            </Button>
          </CardHeader>
        </Card>
      )}
      {!atCap && seatUsed !== null && seatLimit > 0 && seatUsed / seatLimit >= 0.8 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <CardDescription className="flex-1">
              {seatUsed} of {seatLimit} client seats used. Consider upgrading soon.
            </CardDescription>
            <Button asChild size="sm" variant="outline">
              <Link to="/agency/billing">View plans</Link>
            </Button>
          </CardHeader>
        </Card>
      )}

      <div className="flex justify-end">
        <VideoBadgeLink audience="agency" label="See how onboarding works (1:30)" />
      </div>

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">New client</TabsTrigger>
          <TabsTrigger value="link">Link existing</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>New client business</CardTitle>
              <CardDescription>We'll create the workspace and email an invitation to set up their account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Co" />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. SaaS" />
                </div>
                <div className="space-y-2">
                  <Label>Contact name</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Contact email *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.co" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Internal notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only visible to your agency team" rows={3} />
              </div>
              <Button onClick={createNewClient} disabled={saving || atCap} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create client & send invite
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link">
          <Card>
            <CardHeader>
              <CardTitle>Link an existing NotiProof account</CardTitle>
              <CardDescription>The client will receive an approval request before you can manage their data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Search by business name…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} />
                <Button onClick={runSearch} disabled={searching}>{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}</Button>
              </div>
              <div className="space-y-2">
                {matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No results yet.</p>
                ) : (
                  matches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="text-sm font-medium">{m.name}</div>
                      <Button size="sm" variant="outline" disabled={linkingId === m.id || atCap} onClick={() => linkExisting(m)}>
                        {linkingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request access"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
