import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const db = supabase as any;

interface Row {
  user_id: string; email: string; full_name: string | null; last_sign_in_at: string; days_quiet: number;
  business_name: string | null; plan: string | null; emails: { template: string; sent_at: string }[]; unsubscribed: boolean;
}

const LABEL: Record<string, string> = { winback_14: "Auto 14d", winback_30: "Auto 30d", winback_60: "Auto 60d", reactivation_manual: "Manual" };

export default function AdminDormant() {
  const [days, setDays] = useState("14");
  const [plan, setPlan] = useState("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.rpc("admin_dormant_users", { _min_days: Number(days) });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setSel(new Set());
    setLoading(false);
  };
  useEffect(() => { load(); }, [days]);

  const plans = useMemo(() => Array.from(new Set(rows.map((r) => r.plan).filter(Boolean))) as string[], [rows]);
  const shown = rows.filter((r) => plan === "all" || r.plan === plan);
  const selectable = shown.filter((r) => !r.unsubscribed);

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("lifecycle-mailer", { body });
    if (error) {
      const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      throw new Error(details);
    }
    return data;
  };

  const openPreview = async () => {
    try { setPreview(await invoke({ mode: "reactivation", user_ids: [], preview: true })); }
    catch (e: any) { toast.error(e.message); }
  };

  const send = async () => {
    setSending(true);
    try {
      const r = await invoke({ mode: "reactivation", user_ids: Array.from(sel) });
      toast.success(`Sent ${r.sent}${r.skipped ? `, skipped ${r.skipped} unsubscribed` : ""}${r.failed ? `, ${r.failed} failed` : ""}`);
      setPreview(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  };

  const returned = (r: Row) => r.emails.some((e) => new Date(r.last_sign_in_at) > new Date(e.sent_at));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dormant users</h1>
        <p className="text-sm text-muted-foreground">People who have logged in before but not recently. Reactivation emails also go out automatically at 14, 30 and 60 days without a login.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">{shown.length} quiet users</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["14", "30", "60", "90"].map((d) => <SelectItem key={d} value={d}>Quiet {d}+ days</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {plans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button disabled={sel.size === 0} onClick={openPreview}>Send reactivation email ({sel.size})</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users have been quiet this long.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectable.length > 0 && selectable.every((r) => sel.has(r.user_id))}
                      onCheckedChange={(v) => setSel(v ? new Set(selectable.map((r) => r.user_id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>User</TableHead><TableHead>Business</TableHead><TableHead>Plan</TableHead>
                  <TableHead>Last login</TableHead><TableHead>Days quiet</TableHead><TableHead>Emails sent</TableHead><TableHead>Came back</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell>
                      <Checkbox disabled={r.unsubscribed} checked={sel.has(r.user_id)} onCheckedChange={(v) => {
                        const n = new Set(sel); v ? n.add(r.user_id) : n.delete(r.user_id); setSel(n);
                      }} />
                    </TableCell>
                    <TableCell><div className="font-medium">{r.full_name || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></TableCell>
                    <TableCell>{r.business_name ?? "—"}</TableCell>
                    <TableCell>{r.plan ?? "—"}</TableCell>
                    <TableCell>{new Date(r.last_sign_in_at).toLocaleDateString()}</TableCell>
                    <TableCell>{r.days_quiet}</TableCell>
                    <TableCell className="space-x-1">
                      {r.unsubscribed && <Badge variant="destructive">Unsubscribed</Badge>}
                      {r.emails.length === 0 && !r.unsubscribed && <span className="text-xs text-muted-foreground">None yet</span>}
                      {r.emails.map((e, i) => <Badge key={i} variant="outline" title={new Date(e.sent_at).toLocaleString()}>{LABEL[e.template] ?? e.template}</Badge>)}
                    </TableCell>
                    <TableCell>{r.emails.length ? (returned(r) ? <Badge>Yes</Badge> : "Not yet") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Send to {sel.size} user{sel.size === 1 ? "" : "s"}?</DialogTitle></DialogHeader>
          <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {preview?.subject}</p>
          <iframe title="Email preview" className="w-full h-96 rounded border" srcDoc={preview?.html} sandbox="" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button onClick={send} disabled={sending}>{sending ? "Sending…" : "Send now"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
