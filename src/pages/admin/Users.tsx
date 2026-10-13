import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SIGNUP_REASONS, SIGNUP_SOURCES } from "@/lib/attribution";

const db = supabase as any;
const label = (list: readonly { value: string; label: string }[], v?: string | null) =>
  v ? list.find((x) => x.value === v)?.label ?? v : "—";

interface Row {
  id: string; email: string; full_name: string | null; created_at: string; is_admin: boolean; agency: string | null;
  businesses: { id: string; name: string; role: string; plan: string; paying: boolean }[];
  reason?: string; source?: string; source_detail?: string | null;
}

export default function AdminUsers() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: users }, { data: bu }, { data: biz }, { data: att }, { data: ag }] = await Promise.all([
        db.from("users").select("id, email, full_name, created_at, is_admin, agency_id").order("created_at", { ascending: false }).limit(1000),
        db.from("business_users").select("user_id, business_id, role").limit(5000),
        db.from("businesses").select("id, name, plan_tier, plan, stripe_subscription_id").limit(5000),
        db.from("signup_attribution").select("user_id, reason, source, source_detail").limit(5000),
        db.from("agencies").select("id, name").limit(1000),
      ]);
      const bizMap = new Map<string, any>((biz ?? []).map((b: any) => [b.id, b]));
      setRows(((users ?? []) as any[]).map((u) => {
        const a = (att ?? []).find((x: any) => x.user_id === u.id);
        return {
          id: u.id, email: u.email, full_name: u.full_name, created_at: u.created_at, is_admin: u.is_admin,
          agency: (ag ?? []).find((x: any) => x.id === u.agency_id)?.name ?? null,
          businesses: ((bu ?? []) as any[]).filter((m) => m.user_id === u.id).map((m) => {
            const b = bizMap.get(m.business_id);
            return { id: m.business_id, name: b?.name ?? "—", role: m.role, plan: b?.plan_tier ?? b?.plan ?? "—", paying: !!b?.stripe_subscription_id };
          }),
          reason: a?.reason, source: a?.source, source_detail: a?.source_detail,
        };
      }));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.email, r.full_name ?? "", ...r.businesses.map((b) => b.name)].some((v) => v.toLowerCase().includes(s)));
  }, [rows, q]);

  const owners = rows.filter((r) => r.businesses.some((b) => b.role === "owner")).length;
  const paying = rows.filter((r) => r.businesses.some((b) => b.paying && b.role === "owner")).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="mt-1 text-muted-foreground">{rows.length} people · {owners} own a business · {paying} paying</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Everyone</CardTitle>
          <Input className="max-w-xs" placeholder="Search name, email or business" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Person</TableHead><TableHead>Joined</TableHead><TableHead>Businesses</TableHead>
                <TableHead>Why they signed up</TableHead><TableHead>Heard about us</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                      <div className="mt-1 flex gap-1">
                        {r.is_admin && <Badge>Admin</Badge>}
                        {r.agency && <Badge variant="outline">Agency: {r.agency}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="space-y-1">
                      {r.businesses.length === 0 ? <span className="text-sm text-muted-foreground">None</span> : r.businesses.map((b) => (
                        <div key={b.id} className="text-sm">
                          <Link className="underline" to={`/admin/businesses/${b.id}`}>{b.name}</Link>
                          <span className="text-xs text-muted-foreground"> · {b.role} · {b.plan}{b.paying ? " · paying" : ""}</span>
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-sm">{label(SIGNUP_REASONS, r.reason)}</TableCell>
                    <TableCell className="text-sm">{label(SIGNUP_SOURCES, r.source)}{r.source_detail ? ` — ${r.source_detail}` : ""}</TableCell>
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
