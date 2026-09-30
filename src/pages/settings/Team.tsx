import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MailPlus, Trash2, Users, AlertTriangle } from "lucide-react";
import { usePlanUsage } from "@/lib/plan-helpers";
import { teamInviteSchema, parseOrError } from "@/lib/validation";

type Role = "owner" | "editor" | "viewer";
interface Member { id: string; user_id: string; role: Role; users: { full_name: string | null; email: string } | null; }
interface Invite { id: string; email: string; role: Role; status: string; token: string; expires_at: string; }

const db = supabase as any;

export default function TeamSettings() {
  const { currentBusinessId, currentBusinessRole, user } = useAuth();
  const { toast } = useToast();
  const { usage, plan, atSeatLimit, seatLimit, refresh: refreshUsage } = usePlanUsage();
  const [items, setItems] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");

  const canManage = currentBusinessRole === "owner";
  const seatsUsed = usage.seats + usage.pending_invites;
  const inviteDisabled = !canManage || saving || !email.trim() || atSeatLimit;
  const inviteBaseUrl = useMemo(() => `${window.location.origin}/signup?invite=`, []);

  const load = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    const [members, pendingInvites] = await Promise.all([
      supabase.from("business_users").select("id, user_id, role, users:user_id (full_name, email)").eq("business_id", currentBusinessId),
      db.from("team_invitations").select("id, email, role, status, token, expires_at").eq("business_id", currentBusinessId).order("created_at", { ascending: false }),
    ]);
    setItems((members.data ?? []) as Member[]);
    setInvites((pendingInvites.data ?? []) as Invite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentBusinessId]);

  const invite = async () => {
    if (!currentBusinessId) return;
    const parsed = parseOrError(teamInviteSchema, { email, role });
    if (parsed.error) {
      return toast({ title: "Check the invite", description: parsed.error, variant: "destructive" });
    }
    setSaving(true);
    const { error } = await db.from("team_invitations").insert({
      business_id: currentBusinessId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user?.id,
    });
    setSaving(false);
    if (error) return toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    setEmail("");
    setRole("viewer");
    toast({ title: "Invite created", description: "Share the generated invite link with your teammate." });
    load();
    refreshUsage();
  };

  const updateRole = async (memberId: string, nextRole: Role) => {
    const { error } = await supabase.from("business_users").update({ role: nextRole }).eq("id", memberId);
    if (error) return toast({ title: "Role update failed", description: error.message, variant: "destructive" });
    setItems((rows) => rows.map((m) => m.id === memberId ? { ...m, role: nextRole } : m));
    toast({ title: "Role updated" });
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from("business_users").delete().eq("id", memberId);
    if (error) return toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    setItems((rows) => rows.filter((m) => m.id !== memberId));
    toast({ title: "Member removed" });
    refreshUsage();
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await db.from("team_invitations").update({ status: "revoked" }).eq("id", inviteId);
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    setInvites((rows) => rows.map((i) => i.id === inviteId ? { ...i, status: "revoked" } : i));
    toast({ title: "Invite revoked" });
    refreshUsage();
  };

  const copyInvite = async (token: string) => {
    await navigator.clipboard.writeText(`${inviteBaseUrl}${token}`);
    toast({ title: "Invite link copied" });
  };

  return (
    <TooltipProvider>
    <div className="max-w-5xl space-y-4">
      {atSeatLimit && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-destructive" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Seat limit reached</p>
            <p className="text-sm text-muted-foreground">
              You're using {seatsUsed} of {seatLimit} seat{seatLimit === 1 ? "" : "s"} on the {plan.name} plan.
              Upgrade your plan or purchase extra seats to invite more teammates.
            </p>
          </div>
          <Button asChild size="sm"><Link to="/settings/billing">Upgrade</Link></Button>
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Invite teammate</CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            {seatsUsed} / {seatLimit} seat{seatLimit === 1 ? "" : "s"} used
          </span>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} maxLength={254} inputMode="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" disabled={!canManage || atSeatLimit} /></div>
          <div className="space-y-2"><Label>Role</Label><Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={!canManage || atSeatLimit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Viewer</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="owner">Owner</SelectItem></SelectContent></Select></div>
          {atSeatLimit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled className="w-full"><MailPlus className="h-4 w-4 mr-2" />Invite</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Seat limit reached — upgrade or buy extra seats.</TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={invite} disabled={inviteDisabled}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MailPlus className="h-4 w-4 mr-2" />}Invite</Button>
          )}
          {!canManage && <p className="text-xs text-muted-foreground sm:col-span-3">Only owners can invite teammates, change roles, or remove members.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Team members</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : items.length === 0 ? (
            <div className="py-12 text-center"><div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-3"><Users className="h-6 w-6" /></div><h3 className="font-semibold">No team members yet</h3></div>
          ) : (
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{items.map((m) => (
              <TableRow key={m.id}><TableCell className="font-medium">{m.users?.full_name ?? "—"}</TableCell><TableCell className="text-muted-foreground text-sm">{m.users?.email}</TableCell><TableCell>{canManage ? <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as Role)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Viewer</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="owner">Owner</SelectItem></SelectContent></Select> : <Badge variant="outline" className="capitalize">{m.role}</Badge>}</TableCell><TableCell>{canManage && m.user_id !== user?.id ? <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4" /></Button> : null}</TableCell></TableRow>
            ))}</TableBody></Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending invitations</CardTitle></CardHeader>
        <CardContent>
          {invites.length === 0 ? <p className="text-sm text-muted-foreground">No invitations yet.</p> : <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{invites.map((invite) => <TableRow key={invite.id}><TableCell>{invite.email}</TableCell><TableCell><Badge variant="outline" className="capitalize">{invite.role}</Badge></TableCell><TableCell><Badge variant={invite.status === "pending" ? "default" : "secondary"} className="capitalize">{invite.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(invite.expires_at).toLocaleDateString()}</TableCell><TableCell className="text-right space-x-2"><Button variant="outline" size="sm" onClick={() => copyInvite(invite.token)} disabled={invite.status !== "pending"}>Copy link</Button><Button variant="ghost" size="sm" onClick={() => revokeInvite(invite.id)} disabled={invite.status !== "pending"}>Revoke</Button></TableCell></TableRow>)}</TableBody></Table>}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
