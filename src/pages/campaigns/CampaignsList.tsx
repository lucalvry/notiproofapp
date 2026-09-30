import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Megaphone, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const db = supabase as any;

type Row = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  requests_sent_count: number;
  updated_at: string;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  post_purchase: "Post-purchase",
  milestone: "Milestone",
  anniversary: "Anniversary",
  manual: "Manual",
};

export default function CampaignsList() {
  const { currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = () => {
    if (!currentBusinessId) return;
    setLoading(true);
    db.from("campaigns")
      .select("id, name, type, is_active, requests_sent_count, updated_at, created_at")
      .eq("business_id", currentBusinessId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setRows(((data as any[]) ?? []) as Row[]);
        setLoading(false);
      });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [currentBusinessId]);

  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter !== "all") list = list.filter((r) => r.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [rows, typeFilter, search]);

  const toggleActive = async (id: string, next: boolean) => {
    const prev = rows;
    setRows((r) => r.map((x) => x.id === id ? { ...x, is_active: next } : x));
    const { error } = await db.from("campaigns").update({ is_active: next }).eq("id", id);
    if (error) {
      setRows(prev);
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automate testimonial requests based on customer events.
          </p>
        </div>
        <Button onClick={() => navigate("/campaigns/new")}>
          <Plus className="h-4 w-4 mr-1.5" /> New campaign
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            maxLength={100}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/60" />
            <p className="text-muted-foreground">No campaigns yet.</p>
            <Button onClick={() => navigate("/campaigns/new")}>
              <Plus className="h-4 w-4 mr-1.5" /> Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Requests sent</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link to={`/campaigns/${r.id}`} className="hover:underline">{r.name}</Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[r.type] ?? r.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.requests_sent_count ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive(r.id, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/campaigns/${r.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
