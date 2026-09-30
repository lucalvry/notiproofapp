import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface ClientRow {
  relationship_id: string;
  client_business_id: string;
  status: string;
  client_plan: string | null;
  business: {
    id: string;
    name: string;
    industry: string | null;
    plan: string | null;
    created_at: string;
  } | null;
  health?: number | null;
}

function healthBadge(score: number | null | undefined) {
  if (score == null) return <Badge variant="outline">—</Badge>;
  if (score >= 70) return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Healthy {score}</Badge>;
  if (score >= 40) return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">At risk {score}</Badge>;
  return <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/15">Critical {score}</Badge>;
}

export default function ClientsList() {
  const { agency, setActiveClientId } = useAgency();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  useEffect(() => {
    if (!agency) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agency_client_relationships")
        .select(
          "id, client_business_id, status, client_plan, business:businesses!agency_client_relationships_client_business_id_fkey(id, name, industry, plan, created_at)",
        )
        .eq("agency_id", agency.id)
        .neq("status", "removed")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const mapped: ClientRow[] = (data ?? []).map((r) => ({
        relationship_id: r.id,
        client_business_id: r.client_business_id,
        status: r.status,
        client_plan: r.client_plan,
        business: r.business as ClientRow["business"],
      }));
      // Pull health scores in parallel.
      const scores = await Promise.all(
        mapped.map(async (r) => {
          try {
            const res = await supabase.rpc("get_client_health_score", { _client_business_id: r.client_business_id });
            const row = Array.isArray(res.data) ? res.data[0] : null;
            return row && typeof row.score === "number" ? row.score : null;
          } catch {
            return null;
          }
        }),
      );


      mapped.forEach((r, i) => (r.health = scores[i]));
      if (!cancelled) {
        setRows(mapped);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agency?.id]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (healthFilter !== "all") {
        const h = r.health ?? -1;
        if (healthFilter === "healthy" && h < 70) return false;
        if (healthFilter === "at_risk" && (h < 40 || h >= 70)) return false;
        if (healthFilter === "critical" && (h < 0 || h >= 40)) return false;
      }
      if (search && !r.business?.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, search, statusFilter, healthFilter]);

  const openClient = (id: string) => {
    setActiveClientId(id);
    navigate(`/agency/clients/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">
            {rows.length} of {agency?.client_seat_limit ?? "—"} seats used
          </p>
        </div>
        <Button asChild>
          <Link to="/agency/clients/new">
            <Plus className="h-4 w-4 mr-2" /> Add client
          </Link>
        </Button>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Health" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All health</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="at_risk">At risk</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="text-sm text-muted-foreground mb-3">
                    {rows.length === 0 ? "No clients yet." : "No clients match these filters."}
                  </div>
                  {rows.length === 0 && (
                    <Button asChild><Link to="/agency/clients/new"><Plus className="h-4 w-4 mr-2" />Add your first client</Link></Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.relationship_id} className="cursor-pointer" onClick={() => openClient(r.client_business_id)}>
                  <TableCell className="font-medium">{r.business?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.business?.industry ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.client_plan ?? r.business?.plan ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "active" ? "default" : "outline"} className="capitalize">{r.status}</Badge>
                  </TableCell>
                  <TableCell>{healthBadge(r.health)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openClient(r.client_business_id); }}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
