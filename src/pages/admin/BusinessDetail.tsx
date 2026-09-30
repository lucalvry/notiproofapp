import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  LogIn,
  Mail,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";

const db = supabase as any;

interface Business {
  id: string;
  name: string;
  plan: string;
  plan_tier?: string;
  suspended_at: string | null;
  install_verified: boolean;
  onboarding_completed: boolean;
  industry: string | null;
  time_zone: string;
  website_url: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

interface Counts {
  users: number;
  widgets: number;
  proof: number;
  integrations: number;
}

interface AuditEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_user_id: string | null;
  admin_email?: string | null;
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const [b, setB] = useState<Business | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [proof, setProof] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("14");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const load = async () => {
    if (!id) return;
    const [bz, u, w, p, i, proofRows, integrationRows, auditRows] = await Promise.all([
      db.from("businesses").select("*").eq("id", id).maybeSingle(),
      supabase.from("business_users").select("id", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("widgets").select("id", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("integrations").select("id", { count: "exact", head: true }).eq("business_id", id),
      supabase
        .from("proof_objects")
        .select("id, type, status, author_name, source, created_at, verified")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("integrations")
        .select("id, provider, status, last_sync_at, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      db
        .from("admin_audit_log")
        .select("id, action, details, created_at, admin_user_id")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    setB(bz.data as Business | null);
    setCounts({
      users: u.count ?? 0,
      widgets: w.count ?? 0,
      proof: p.count ?? 0,
      integrations: i.count ?? 0,
    });
    setProof(proofRows.data ?? []);
    setIntegrations(integrationRows.data ?? []);

    const auditList = (auditRows.data ?? []) as AuditEntry[];
    // Resolve admin emails
    const adminIds = Array.from(
      new Set(auditList.map((a) => a.admin_user_id).filter(Boolean) as string[]),
    );
    let emailMap = new Map<string, string>();
    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from("users")
        .select("id, email")
        .in("id", adminIds);
      (admins ?? []).forEach((u: any) => emailMap.set(u.id, u.email));
    }
    setAudit(
      auditList.map((a) => ({
        ...a,
        admin_email: a.admin_user_id ? emailMap.get(a.admin_user_id) ?? null : null,
      })),
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const logAction = async (action: string, details: Record<string, unknown> = {}) => {
    if (!id) return;
    await db.rpc("log_admin_action", { _business_id: id, _action: action, _details: details });
  };

  const updatePlan = async (plan: string) => {
    if (!id || !b) return;
    setSaving(true);
    const { error } = await db
      .from("businesses")
      .update({ plan, plan_tier: plan })
      .eq("id", id);
    if (!error) await logAction("change_plan", { from: b.plan_tier ?? b.plan, to: plan });
    setSaving(false);
    if (error) {
      return toast({
        title: "Plan update failed",
        description: error.message,
        variant: "destructive",
      });
    }
    toast({ title: "Plan updated" });
    load();
  };

  const performSuspend = async () => {
    if (!id || !b) return;
    if (!suspendReason.trim()) {
      return toast({
        title: "Reason required",
        description: "Provide a brief reason for the audit log.",
        variant: "destructive",
      });
    }
    setSaving(true);
    const { error } = await db
      .from("businesses")
      .update({ suspended_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) await logAction("suspend_business", { reason: suspendReason });
    setSaving(false);
    setSuspendOpen(false);
    setSuspendReason("");
    if (error) {
      return toast({ title: "Action failed", description: error.message, variant: "destructive" });
    }
    toast({ title: "Business suspended" });
    load();
  };

  const reactivate = async () => {
    if (!id || !b) return;
    setSaving(true);
    const { error } = await db.from("businesses").update({ suspended_at: null }).eq("id", id);
    if (!error) await logAction("unsuspend_business");
    setSaving(false);
    if (error) {
      return toast({ title: "Action failed", description: error.message, variant: "destructive" });
    }
    toast({ title: "Business reactivated" });
    load();
  };

  const performExtendTrial = async () => {
    if (!id || !b) return;
    const days = Number(extendDays);
    if (!Number.isFinite(days) || days <= 0) {
      return toast({
        title: "Invalid days",
        description: "Pick a positive number.",
        variant: "destructive",
      });
    }
    const base = b.trial_ends_at ? new Date(b.trial_ends_at) : new Date();
    const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    setSaving(true);
    const { error } = await db.from("businesses").update({ trial_ends_at: next }).eq("id", id);
    if (!error) await logAction("extend_trial", { days, new_trial_ends_at: next });
    setSaving(false);
    setExtendOpen(false);
    if (error) {
      return toast({ title: "Could not extend trial", description: error.message, variant: "destructive" });
    }
    toast({ title: "Trial extended", description: `New end: ${new Date(next).toLocaleString()}` });
    load();
  };

  const resetEmailVerification = async () => {
    if (!id) return;
    await logAction("reset_email_verification");
    toast({
      title: "Audit logged",
      description: "Use the Supabase Auth dashboard to actually re-trigger the verification email for the user.",
    });
    load();
  };

  const performDelete = async () => {
    if (!id || !b) return;
    if (deleteConfirm !== "DELETE") {
      return toast({
        title: "Type DELETE to confirm",
        variant: "destructive",
      });
    }
    setSaving(true);
    await logAction("delete_business", { name: b.name });
    const { error } = await db.from("businesses").delete().eq("id", id);
    setSaving(false);
    setDeleteOpen(false);
    setDeleteConfirm("");
    if (error) {
      return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
    toast({ title: "Business deleted" });
    navigate("/admin/businesses");
  };

  const impersonate = async () => {
    if (!b || !id) return;
    await logAction("impersonation_started", { business_name: b.name });
    startImpersonation(id, b.name);
    toast({
      title: "Now viewing as " + b.name,
      description: "Read-only mode active. Use the banner to stop at any time.",
    });
    navigate("/dashboard");
  };

  if (!b) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/admin/businesses">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ADM-03</div>
          <h1 className="text-3xl font-bold mt-1">{b.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className="capitalize">{b.plan_tier ?? b.plan}</Badge>
            {b.suspended_at ? (
              <Badge variant="destructive">Suspended</Badge>
            ) : (
              <Badge variant="secondary">Active</Badge>
            )}
            {b.install_verified ? (
              <Badge>Installed</Badge>
            ) : (
              <Badge variant="secondary">Not installed</Badge>
            )}
            {b.onboarding_completed ? (
              <Badge variant="outline">Onboarded</Badge>
            ) : (
              <Badge variant="secondary">Onboarding</Badge>
            )}
            {b.trial_ends_at && (
              <Badge variant="outline">
                Trial → {new Date(b.trial_ends_at).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={impersonate}>
            <LogIn className="h-4 w-4 mr-2" />
            Impersonate
          </Button>
          {b.suspended_at ? (
            <Button variant="outline" onClick={reactivate} disabled={saving}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Reactivate
            </Button>
          ) : (
            <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Suspend
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Suspend {b.name}?</DialogTitle>
                  <DialogDescription>
                    Members will be locked out until reactivated. This is logged in the admin audit.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="e.g. Payment failed for 3 cycles, abuse report #142, etc."
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setSuspendOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={performSuspend} disabled={saving}>
                    Suspend
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proof">Proof</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-4 gap-4">
              <Stat label="Users" value={counts?.users} />
              <Stat label="Widgets" value={counts?.widgets} />
              <Stat label="Proof items" value={counts?.proof} />
              <Stat label="Integrations" value={counts?.integrations} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              <Detail label="Industry" value={b.industry} />
              <Detail label="Time zone" value={b.time_zone} />
              <Detail label="Website" value={b.website_url} />
              <Detail label="Created" value={new Date(b.created_at).toLocaleString()} />
              <Detail
                label="Trial ends"
                value={b.trial_ends_at ? new Date(b.trial_ends_at).toLocaleString() : "—"}
              />
              <Detail label="Stripe customer" value={b.stripe_customer_id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proof">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent proof</CardTitle>
            </CardHeader>
            <CardContent>
              {proof.length === 0 ? (
                <p className="text-sm text-muted-foreground">No proof items yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proof.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="capitalize">{p.type}</TableCell>
                        <TableCell>{p.author_name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{p.status}</Badge>
                        </TableCell>
                        <TableCell>{p.source ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              {integrations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No integrations connected.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last sync</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.map((integration) => (
                      <TableRow key={integration.id}>
                        <TableCell className="capitalize">{integration.provider}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{integration.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {integration.last_sync_at
                            ? new Date(integration.last_sync_at).toLocaleString()
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-center">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />Plan
                  </div>
                  <p className="text-sm text-muted-foreground">Override the business plan.</p>
                </div>
                <Select value={b.plan_tier ?? b.plan} onValueChange={updatePlan} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Detail label="Stripe customer" value={b.stripe_customer_id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Extend trial */}
              <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" /> Extend trial
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Push the trial end date forward by N days.
                    </div>
                  </div>
                  <DialogTrigger asChild>
                    <Button variant="outline">Extend</Button>
                  </DialogTrigger>
                </div>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Extend trial</DialogTitle>
                    <DialogDescription>
                      Current trial ends:{" "}
                      {b.trial_ends_at
                        ? new Date(b.trial_ends_at).toLocaleString()
                        : "no trial set — will start from today"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="days">Add days</Label>
                    <Input
                      id="days"
                      type="number"
                      min={1}
                      value={extendDays}
                      onChange={(e) => setExtendDays(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setExtendOpen(false)}>Cancel</Button>
                    <Button onClick={performExtendTrial} disabled={saving}>Extend</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Reset email verification */}
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Reset email verification
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Logs the request and prompts you to re-trigger via Supabase Auth.
                  </div>
                </div>
                <Button variant="outline" onClick={resetEmailVerification}>
                  Reset
                </Button>
              </div>

              {/* Delete */}
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 p-3">
                  <div>
                    <div className="font-medium flex items-center gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" /> Delete business
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Permanently removes the business and all related rows. This cannot be undone.
                    </div>
                  </div>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </DialogTrigger>
                </div>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete {b.name}?</DialogTitle>
                    <DialogDescription>
                      Type <span className="font-mono font-bold">DELETE</span> below to confirm. All data tied to this business will be removed.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    className="font-mono"
                  />
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={performDelete}
                      disabled={saving || deleteConfirm !== "DELETE"}
                    >
                      Permanently delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />Audit log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admin actions logged yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Reason / details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map((entry) => {
                      const reason = (entry.details as any)?.reason;
                      const rest = entry.details
                        ? Object.fromEntries(
                            Object.entries(entry.details).filter(([k]) => k !== "reason"),
                          )
                        : {};
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium capitalize">
                            {entry.action.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.admin_email ?? entry.admin_user_id?.slice(0, 8) ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md">
                            {reason && <div className="font-medium text-foreground">{String(reason)}</div>}
                            {Object.keys(rest).length > 0 && (
                              <div className="text-xs font-mono break-all">
                                {JSON.stringify(rest)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value === undefined ? "…" : value.toLocaleString()}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> {value || "—"}
    </div>
  );
}
