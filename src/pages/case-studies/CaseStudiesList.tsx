import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus } from "lucide-react";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";

const db = supabase as any;

interface Row {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  customer_handle: string | null;
  length_target: string | null;
  updated_at: string;
}

export default function CaseStudiesList() {
  const { currentBusinessId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    let q = db
      .from("case_studies")
      .select("id,title,slug,status,customer_handle,length_target,updated_at")
      .eq("business_id", currentBusinessId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);
    q.then(({ data }: any) => {
      setRows(((data as Row[]) ?? []).filter((r) =>
        !search ? true : (r.title || "").toLowerCase().includes(search.toLowerCase()),
      ));
      setLoading(false);
    });
  }, [currentBusinessId, status, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <ReadOnlyBanner />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">CS-01</div>
          <h1 className="text-3xl font-bold mt-1">Case studies</h1>
          <p className="text-muted-foreground mt-1">Long-form customer stories generated from your approved proof.</p>
        </div>
        <Button asChild>
          <Link to="/case-studies/generate"><Plus className="h-4 w-4 mr-1.5" /> New case study</Link>
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title…" className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground space-y-2">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p>No case studies yet.</p>
            <Button asChild size="sm" className="mt-2"><Link to="/case-studies/generate">Generate your first</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Link key={r.id} to={`/case-studies/${r.id}/edit`} className="block">
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>
                    {r.length_target && <Badge variant="secondary" className="text-[10px] capitalize">{r.length_target}</Badge>}
                  </div>
                  <h3 className="font-semibold line-clamp-2">{r.title}</h3>
                  {r.customer_handle && <p className="text-xs text-muted-foreground">{r.customer_handle}</p>}
                  <p className="text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
