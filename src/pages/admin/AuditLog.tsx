import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const db = supabase as any;

interface Entry { id: string; action: string; details: Record<string, unknown>; created_at: string; business_id: string | null; admin_user_id: string | null; admin?: string; business?: string }

export default function AdminAuditLog() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      const list = (data ?? []) as Entry[];
      const uids = [...new Set(list.map((r) => r.admin_user_id).filter(Boolean))];
      const bids = [...new Set(list.map((r) => r.business_id).filter(Boolean))];
      const [{ data: u }, { data: b }] = await Promise.all([
        uids.length ? db.from("users").select("id, email").in("id", uids) : { data: [] },
        bids.length ? db.from("businesses").select("id, name").in("id", bids) : { data: [] },
      ]);
      setRows(list.map((r) => ({
        ...r,
        admin: (u ?? []).find((x: any) => x.id === r.admin_user_id)?.email,
        business: (b ?? []).find((x: any) => x.id === r.business_id)?.name,
      })));
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => [r.action, r.admin ?? "", r.business ?? ""].some((v) => v.toLowerCase().includes(s))) : rows;
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit log</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Every admin action ({rows.length})</CardTitle>
          <Input className="max-w-xs" placeholder="Filter by action, admin or business" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Business</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{r.admin ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.action.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm">{r.business_id ? <Link className="underline" to={`/admin/businesses/${r.business_id}`}>{r.business ?? "Open"}</Link> : "—"}</TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">{Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : ""}</TableCell>
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
