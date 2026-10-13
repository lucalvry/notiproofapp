import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCents } from "@/lib/referrals";
import { SIGNUP_REASONS, SIGNUP_SOURCES } from "@/lib/attribution";

interface SourceRow { source: string; source_detail: string; reason: string; signups: number }
interface Owed { referrer_user_id: string; email: string; total: number; currency: string; ids: string[]; payout: string }

const label = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

export default function AdminGrowth() {
  const { toast } = useToast();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [owed, setOwed] = useState<Owed[]>([]);

  const load = async () => {
    const { data: s } = await supabase.rpc("admin_signup_sources" as never);
    setSources((s as SourceRow[]) ?? []);
    const { data: c } = await supabase.from("referral_commissions" as never)
      .select("id, referrer_user_id, commission_cents, currency").eq("status", "pending");
    const rows = (c as { id: string; referrer_user_id: string; commission_cents: number; currency: string }[]) ?? [];
    const ids = [...new Set(rows.map((r) => r.referrer_user_id))];
    const [{ data: users }, { data: pays }] = ids.length
      ? await Promise.all([
          supabase.from("users").select("id, email").in("id", ids),
          supabase.from("referral_payout_details" as never).select("user_id, method, details").in("user_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const map = new Map<string, Owed>();
    for (const r of rows) {
      const o = map.get(r.referrer_user_id) ?? {
        referrer_user_id: r.referrer_user_id,
        email: (users as { id: string; email: string }[] | null)?.find((u) => u.id === r.referrer_user_id)?.email ?? r.referrer_user_id,
        total: 0, currency: r.currency, ids: [],
        payout: (() => { const p = (pays as { user_id: string; method: string; details: string }[] | null)?.find((x) => x.user_id === r.referrer_user_id); return p ? `${p.method}: ${p.details}` : "Not provided"; })(),
      };
      o.total += r.commission_cents; o.ids.push(r.id); map.set(r.referrer_user_id, o);
    }
    setOwed([...map.values()]);
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (o: Owed) => {
    const { error } = await supabase.from("referral_commissions" as never)
      .update({ status: "paid", paid_out_at: new Date().toISOString() } as never).in("id", o.ids);
    toast(error ? { title: "Couldn't update", description: error.message, variant: "destructive" } : { title: "Marked as paid" });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sign-ups & referrals</h1>
      <Card>
        <CardHeader><CardTitle>Commissions owed</CardTitle></CardHeader>
        <CardContent>
          {owed.length === 0 ? <p className="text-sm text-muted-foreground">Nothing owed right now.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Referrer</TableHead><TableHead>Payout details</TableHead><TableHead>Owed</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {owed.map((o) => (
                  <TableRow key={o.referrer_user_id}>
                    <TableCell>{o.email}</TableCell>
                    <TableCell className="text-sm">{o.payout}</TableCell>
                    <TableCell>{formatCents(o.total, o.currency)}</TableCell>
                    <TableCell><Button size="sm" onClick={() => markPaid(o)}>Mark paid</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Where sign-ups come from</CardTitle></CardHeader>
        <CardContent>
          {sources.length === 0 ? <p className="text-sm text-muted-foreground">No answers yet. New sign-ups will appear here.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Detail</TableHead><TableHead>Reason</TableHead><TableHead>Sign-ups</TableHead></TableRow></TableHeader>
              <TableBody>
                {sources.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{label(SIGNUP_SOURCES, s.source)}</TableCell>
                    <TableCell>{s.source_detail || "—"}</TableCell>
                    <TableCell>{label(SIGNUP_REASONS, s.reason)}</TableCell>
                    <TableCell>{s.signups}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
