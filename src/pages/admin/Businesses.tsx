import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Search, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type B = Database["public"]["Tables"]["businesses"]["Row"];

interface BusinessRow extends B {
  owner_email?: string | null;
  primary_domain?: string | null;
}

const PLAN_OPTIONS = ["any", "free", "starter", "growth", "agency"] as const;
const STATUS_OPTIONS = ["any", "active", "suspended", "onboarding", "installed"] as const;
const DATE_OPTIONS = [
  { value: "any", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function AdminBusinesses() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("any");
  const [statusFilter, setStatusFilter] = useState<string>("any");
  const [dateFilter, setDateFilter] = useState<string>("any");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: bizs } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      const list = (bizs ?? []) as BusinessRow[];

      // Resolve a representative owner email per business (first owner).
      if (list.length > 0) {
        const ids = list.map((b) => b.id);
        const { data: members } = await supabase
          .from("business_users")
          .select("business_id, role, users(email)")
          .in("business_id", ids)
          .eq("role", "owner");
        const map = new Map<string, string>();
        ((members ?? []) as any[]).forEach((m) => {
          if (!map.has(m.business_id) && m.users?.email) map.set(m.business_id, m.users.email);
        });
        list.forEach((b) => {
          b.owner_email = map.get(b.id) ?? null;
        });

        // Resolve the primary domain per business.
        const { data: doms } = await (supabase as any)
          .from("business_domains")
          .select("business_id, domain, is_primary")
          .in("business_id", ids)
          .eq("is_primary", true);
        const dmap = new Map<string, string>();
        ((doms ?? []) as any[]).forEach((d) => { dmap.set(d.business_id, d.domain); });
        list.forEach((b) => { b.primary_domain = dmap.get(b.id) ?? null; });
      }

      setItems(list);
      setLoading(false);
    })();
  }, []);

  // When the search needle looks like a domain, augment the in-memory list with
  // any extra businesses whose business_domains.domain matches.
  useEffect(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !/[a-z0-9.-]/.test(needle)) return;
    let cancelled = false;
    (async () => {
      const { data: hits } = await (supabase as any)
        .from("business_domains")
        .select("business_id, domain, is_primary")
        .ilike("domain", `%${needle}%`)
        .limit(100);
      if (cancelled || !hits || hits.length === 0) return;
      const knownIds = new Set(items.map((b) => b.id));
      const missingIds = Array.from(new Set((hits as any[]).map((h) => h.business_id as string))).filter((id) => !knownIds.has(id));
      if (missingIds.length === 0) return;
      const { data: extraBizs } = await supabase
        .from("businesses")
        .select("*")
        .in("id", missingIds);
      if (cancelled || !extraBizs) return;
      const dmap = new Map<string, string>();
      (hits as any[]).filter((h) => h.is_primary).forEach((h) => dmap.set(h.business_id, h.domain));
      const extras = (extraBizs as BusinessRow[]).map((b) => ({ ...b, primary_domain: dmap.get(b.id) ?? null }));
      setItems((prev) => [...prev, ...extras]);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const cutoff =
      dateFilter === "any" ? null : new Date(Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000);

    return items.filter((b) => {
      if (needle) {
        const haystack = [
          b.name,
          b.id,
          (b as any).website_url ?? "",
          b.owner_email ?? "",
          (b as any).slug ?? "",
          b.primary_domain ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (planFilter !== "any" && ((b as any).plan_tier ?? b.plan) !== planFilter) return false;
      if (statusFilter !== "any") {
        if (statusFilter === "suspended" && !(b as any).suspended_at) return false;
        if (statusFilter === "active" && (b as any).suspended_at) return false;
        if (statusFilter === "onboarding" && (b as any).onboarding_completed) return false;
        if (statusFilter === "installed" && !b.install_verified) return false;
      }
      if (cutoff && new Date(b.created_at) < cutoff) return false;
      return true;
    });
  }, [items, q, planFilter, statusFilter, dateFilter]);

  const clearFilters = () => {
    setQ("");
    setPlanFilter("any");
    setStatusFilter("any");
    setDateFilter("any");
  };

  const hasFilters = q || planFilter !== "any" || statusFilter !== "any" || dateFilter !== "any";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ADM-02</div>
        <h1 className="text-3xl font-bold mt-1">Businesses</h1>
        <p className="text-muted-foreground mt-1">
          Search and manage every business on the platform.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, website, owner email…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p === "any" ? "All plans" : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s === "any" ? "All statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${filtered.length} of ${items.length} businesses`}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No businesses match your filters.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Primary Domain</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Installed</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/businesses/${b.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div>{b.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                          {(b as any).website_url ?? (b as any).slug ?? b.id.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {b.owner_email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {b.primary_domain ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {(b as any).plan_tier ?? b.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(b as any).suspended_at ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : !(b as any).onboarding_completed ? (
                          <Badge variant="secondary">Onboarding</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {b.install_verified ? (
                          <Badge variant="outline">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
