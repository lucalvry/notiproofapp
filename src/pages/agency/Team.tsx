import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Plus, Send, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Member = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  invitation_accepted_at: string | null;
  created_at: string;
  user: { id: string; email: string | null; full_name: string | null } | null;
};

type Invitation = {
  id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  expires_at: string;
  created_at: string;
};

type Client = { id: string; name: string };
type Assignment = { id: string; member_id: string; client_business_id: string };

export default function AgencyTeam() {
  const { agency, role: myRole } = useAgency();
  const { user } = useAuth();
  const { toast } = useToast();

  const isAdmin = myRole === "admin";

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!agency) return;
    setLoading(true);
    const [membersRes, invitesRes, relRes, assignRes] = await Promise.all([
      supabase
        .from("agency_team_members")
        .select("id, user_id, role, invitation_accepted_at, created_at, user:users!agency_team_members_user_id_fkey(id, email, full_name)")
        .eq("agency_id", agency.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("agency_team_invitations")
        .select("id, email, role, status, expires_at, created_at")
        .eq("agency_id", agency.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("agency_client_relationships")
        .select("client_business_id, businesses:client_business_id(id, name)")
        .eq("agency_id", agency.id)
        .eq("status", "active"),
      supabase
        .from("agency_member_client_assignments")
        .select("id, member_id, client_business_id")
        .eq("agency_id", agency.id),
    ]);

    setMembers((membersRes.data as unknown as Member[]) ?? []);
    setInvitations((invitesRes.data as Invitation[]) ?? []);
    const cs: Client[] = (relRes.data ?? [])
      .map((r: { businesses: { id: string; name: string } | null }) => r.businesses)
      .filter((b): b is Client => !!b);
    setClients(cs.sort((a, b) => a.name.localeCompare(b.name)));
    setAssignments((assignRes.data as Assignment[]) ?? []);
    setLoading(false);
  }, [agency?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const assignmentSet = useMemo(() => {
    const s = new Set<string>();
    for (const a of assignments) s.add(`${a.member_id}:${a.client_business_id}`);
    return s;
  }, [assignments]);

  const sendInvite = async () => {
    if (!agency || !user) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-agency-team-invitation", {
        body: { agency_id: agency.id, email, role: inviteRole },
      });
      if (error) throw error;
      toast({
        title: "Invitation sent",
        description: (data as { simulated?: boolean })?.simulated
          ? "Email delivery is not configured; copy the link from the invitations list."
          : `Sent to ${email}`,
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      load();
    } catch (e) {
      toast({
        title: "Could not send invitation",
        description: (e as Error)?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase
      .from("agency_team_invitations")
      .update({ status: "revoked" })
      .eq("id", id);
    if (error) {
      toast({ title: "Could not revoke", description: error.message, variant: "destructive" });
      return;
    }
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  };

  const changeRole = async (member: Member, nextRole: "admin" | "member") => {
    if (member.user_id === user?.id) {
      toast({ title: "You can't change your own role here", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("agency_team_members")
      .update({ role: nextRole })
      .eq("id", member.id);
    if (error) {
      toast({ title: "Could not update role", description: error.message, variant: "destructive" });
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m)));
  };

  const removeMember = async (member: Member) => {
    if (member.user_id === user?.id) {
      toast({ title: "You can't remove yourself", variant: "destructive" });
      return;
    }
    if (!confirm(`Remove ${member.user?.email ?? "this member"} from the agency?`)) return;
    const { error } = await supabase.from("agency_team_members").delete().eq("id", member.id);
    if (error) {
      toast({ title: "Could not remove member", description: error.message, variant: "destructive" });
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    setAssignments((prev) => prev.filter((a) => a.member_id !== member.id));
  };

  const toggleAssignment = async (member: Member, clientId: string, checked: boolean) => {
    if (!agency || !user) return;
    if (member.role === "admin") return; // admins get all clients via has_role
    const key = `${member.id}:${clientId}`;
    if (checked) {
      // optimistic
      const tempId = `temp-${key}`;
      setAssignments((prev) => [...prev, { id: tempId, member_id: member.id, client_business_id: clientId }]);
      const { data, error } = await supabase
        .from("agency_member_client_assignments")
        .insert({
          agency_id: agency.id,
          member_id: member.id,
          client_business_id: clientId,
          assigned_by: user.id,
        })
        .select("id")
        .single();
      if (error) {
        toast({ title: "Could not assign", description: error.message, variant: "destructive" });
        setAssignments((prev) => prev.filter((a) => a.id !== tempId));
        return;
      }
      setAssignments((prev) =>
        prev.map((a) => (a.id === tempId ? { ...a, id: data.id } : a)),
      );
    } else {
      const existing = assignments.find((a) => a.member_id === member.id && a.client_business_id === clientId);
      if (!existing) return;
      setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
      const { error } = await supabase
        .from("agency_member_client_assignments")
        .delete()
        .eq("id", existing.id);
      if (error) {
        toast({ title: "Could not unassign", description: error.message, variant: "destructive" });
        setAssignments((prev) => [...prev, existing]);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm">
            Invite teammates and control which clients each member can access.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Invite member
          </Button>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            Admins can manage all clients, billing, and team. Members only see clients they're assigned to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No team members yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-[1%]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isMe = m.user_id === user?.id;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">
                          {m.user?.full_name || m.user?.email || "Unknown"}
                          {isMe && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.user?.email}</div>
                      </TableCell>
                      <TableCell>
                        {isAdmin && !isMe ? (
                          <Select
                            value={m.role}
                            onValueChange={(v) => changeRole(m, v as "admin" | "member")}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                            {m.role === "admin" ? (
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Admin
                              </span>
                            ) : (
                              "Member"
                            )}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.invitation_accepted_at ? (
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {!isMe && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMember(m)}
                              aria-label="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Pending invitations
            </CardTitle>
            <CardDescription>
              Invitations expire 14 days after they're sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[1%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{inv.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeInvite(inv.id)}
                        aria-label="Revoke invitation"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assignment matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client access</CardTitle>
          <CardDescription>
            Check the box to give a member access to a client. Admins always have access to every client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              Add an active client to start assigning team members.
            </p>
          ) : members.filter((m) => m.role === "member" && m.invitation_accepted_at).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              Invite team members (with the "member" role) to assign them to specific clients.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Member</TableHead>
                    {clients.map((c) => (
                      <TableHead key={c.id} className="text-center min-w-[100px] whitespace-nowrap">
                        {c.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members
                    .filter((m) => m.invitation_accepted_at)
                    .map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">
                            {m.user?.full_name || m.user?.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.role === "admin" ? "All clients" : "Selected clients"}
                          </div>
                        </TableCell>
                        {clients.map((c) => {
                          const has = m.role === "admin" || assignmentSet.has(`${m.id}:${c.id}`);
                          return (
                            <TableCell key={c.id} className="text-center">
                              <Checkbox
                                checked={has}
                                disabled={!isAdmin || m.role === "admin"}
                                onCheckedChange={(v) => toggleAssignment(m, c.id, !!v)}
                                aria-label={`Assign ${m.user?.email ?? "member"} to ${c.name}`}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              We'll email them a link to join {agency?.name ?? "the agency"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@agency.com"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member — assigned to specific clients</SelectItem>
                  <SelectItem value="admin">Admin — full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button onClick={sendInvite} disabled={inviting} className="gap-2">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
