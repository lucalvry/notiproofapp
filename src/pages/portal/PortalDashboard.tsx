import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalSession } from "@/components/layouts/PortalLayout";
import { usePortalBranding } from "@/contexts/PortalBrandingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, FileText, Star, TrendingUp } from "lucide-react";

const db = supabase as any;

interface Stats {
  totalProof: number;
  approvedProof: number;
  contentPieces: number;
  avgRating: number | null;
}

export default function PortalDashboard() {
  const { client } = usePortalSession();
  const { agency } = usePortalBranding();
  const [stats, setStats] = useState<Stats>({ totalProof: 0, approvedProof: 0, contentPieces: 0, avgRating: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [proofAll, proofApproved, content, ratings] = await Promise.all([
        db.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", client.business_id),
        db.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", client.business_id).eq("status", "approved"),
        db.from("content_pieces").select("id", { count: "exact", head: true }).eq("business_id", client.business_id),
        db.from("proof_objects").select("rating").eq("business_id", client.business_id).not("rating", "is", null).limit(1000),
      ]);
      if (cancelled) return;
      const ratingsList = (ratings.data ?? []).map((r: any) => Number(r.rating)).filter((n: number) => !Number.isNaN(n));
      const avg = ratingsList.length ? ratingsList.reduce((a: number, b: number) => a + b, 0) / ratingsList.length : null;
      setStats({
        totalProof: proofAll.count ?? 0,
        approvedProof: proofApproved.count ?? 0,
        contentPieces: content.count ?? 0,
        avgRating: avg,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Welcome{client ? `, ${client.business_name}` : ""}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {agency?.portal_welcome_msg || `Your client portal with ${agency?.name ?? "your agency"}.`}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldCheck} label="Total proof" value={loading ? "…" : stats.totalProof.toString()} />
        <StatCard icon={Star} label="Approved" value={loading ? "…" : stats.approvedProof.toString()} />
        <StatCard icon={FileText} label="Content pieces" value={loading ? "…" : stats.contentPieces.toString()} />
        <StatCard
          icon={TrendingUp}
          label="Avg rating"
          value={loading ? "…" : stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-normal">
          <Icon className="h-4 w-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
