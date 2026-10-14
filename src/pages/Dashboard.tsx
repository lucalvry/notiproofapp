import { TrialCountdown } from "@/components/billing/TrialCountdown";
import { useTrialGate } from "@/hooks/useTrialGate";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareQuote, MonitorSmartphone, Plug, TrendingUp, Star, ShieldCheck, Sparkles } from "lucide-react";
import { UsageBanner } from "@/components/billing/UsageBanner";
import { YouTubeEmbed } from "@/components/video/YouTubeEmbed";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlan } from "@/lib/plan-helpers";
import { SetupChecklist } from "@/components/onboarding/SetupChecklist";
import { InfoTip } from "@/components/help/InfoTip";

import type { Database } from "@/integrations/supabase/types";

// Widened to accept legacy/extra columns (source, type, verified, status, ...)
// not present in the generated DB types.
type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"] & {
  source?: string | null;
  type?: string | null;
  verified?: boolean | null;
  status?: string | null;
};

interface Stats {
  proof: number;
  widgets: number;
  integrations: number;
  conversions: number;
  content_week: number;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const trialGate = useTrialGate();
  const { profile, businesses, currentBusinessId, refresh: refreshAuth } = useAuth();

  // Pick up a trial that starts while this page is open (first widget impression).
  const trialState = trialGate.status.state;
  useEffect(() => {
    if (trialState === "paid" || trialState === "ended") return;
    const onVis = () => { if (document.visibilityState === "visible") refreshAuth(); };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(() => refreshAuth(), 60_000);
    return () => { document.removeEventListener("visibilitychange", onVis); window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialState]);
  const currentBusiness = businesses.find((b) => b.id === currentBusinessId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<ProofRow[] | null>(null);
  const [contentStats, setContentStats] = useState<{ pending: number; published_7d: number; recent: any[] } | null>(null);
  const navigate = useNavigate();
  const { plan } = usePlan();
  const [days, setDays] = useState("30");

  const loadFeed = (bizId: string) =>
    (supabase as any)
      .from("proof_objects")
      .select("*")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }: { data: any[] | null }) => setFeed(data ?? []));

  useEffect(() => {
    if (!currentBusinessId) return;
    // Spec DASH-01: "Assisted conversions this week" → conversion_assist events in last 7 days.
    const since = new Date();
    since.setDate(since.getDate() - Number(days));
    Promise.all([
      supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).gte("created_at", since.toISOString()),
      supabase.from("widgets").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "active"),
      supabase.from("integrations").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "connected"),
      (supabase as any).from("widget_events").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("event_type", "conversion_assist").gte("fired_at", since.toISOString()),
      (supabase as any).from("content_pieces").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).gte("created_at", since.toISOString()),
    ]).then(([p, w, i, c, cw]: any[]) => {
      setStats({ proof: p.count ?? 0, widgets: w.count ?? 0, integrations: i.count ?? 0, conversions: c.count ?? 0, content_week: cw.count ?? 0 });
    });

    loadFeed(currentBusinessId);

    // Content widget data
    const since7 = new Date();
    since7.setDate(since7.getDate() - Number(days));
    Promise.all([
      (supabase as any).from("content_pieces").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "pending_review"),
      (supabase as any).from("content_publish_events").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "published").gte("published_at", since7.toISOString()),
      (supabase as any).from("content_pieces").select("id, output_type, status, updated_at").eq("business_id", currentBusinessId).order("updated_at", { ascending: false }).limit(3),
    ]).then(([p, pub, recent]: any[]) => {
      setContentStats({
        pending: p.count ?? 0,
        published_7d: pub.count ?? 0,
        recent: recent.data ?? [],
      });
    }).catch(() => setContentStats({ pending: 0, published_7d: 0, recent: [] }));

    const channel = supabase
      .channel(`dashboard-feed-${currentBusinessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "proof_objects", filter: `business_id=eq.${currentBusinessId}` },
        () => loadFeed(currentBusinessId),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBusinessId, days]);

  const cards = [
     { label: "Proof added", term: "proofAdded", value: stats?.proof, icon: MessageSquareQuote, color: "text-accent", to: "/proof" },
     { label: "Active widgets", term: "activeWidgets", value: stats?.widgets, icon: MonitorSmartphone, color: "text-teal", to: "/widgets" },
     { label: "Integrations", term: "integrationsStat", value: stats?.integrations, icon: Plug, color: "text-purple", to: "/integrations" },
     { label: "Assisted conversions", term: "assistedConversions", value: stats?.conversions, icon: TrendingUp, color: "text-gold", to: "/analytics" },
     { label: "Content created", term: "contentCreated", value: stats?.content_week, icon: Sparkles, color: "text-purple", to: "/content" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mt-1">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          {currentBusiness && (
            <p className="text-muted-foreground mt-1">{currentBusiness.name} · <span className="capitalize">{currentBusiness.role}</span></p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40" aria-label="Date range"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last 12 months"]].map(([v, l]) => (
                <SelectItem key={v} value={v} disabled={Number(v) > plan.dataRetentionDays}>
                  {l}{Number(v) > plan.dataRetentionDays ? " — paid plans" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild><Link to="/widgets/new" onClick={(e) => { if (!trialGate.requireActive()) e.preventDefault(); }}>Create widget</Link></Button>
        </div>
      </div>

      <TrialCountdown />

      <SetupChecklist />

      <UsageBanner />
      {Number.isFinite(plan.dataRetentionDays) && (
        <p className="text-sm text-muted-foreground">
          Your {plan.name} plan keeps {plan.dataRetentionDays} days of history. <Link to="/settings/billing" className="underline font-medium">Upgrade</Link> to keep your data longer.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color, to, term }) => (
          <Link to={to} key={label}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">{label} <InfoTip term={term as any} /></CardTitle>
                <Icon className={`h-5 w-5 ${color}`} />
              </CardHeader>
              <CardContent>
                {value === undefined ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-bold">{value}</div>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Button variant="ghost" size="sm" asChild><Link to="/proof">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {feed === null ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : feed.length === 0 ? (
            <div className="grid md:grid-cols-2 gap-6 py-6">
              <div className="space-y-3">
                <h3 className="font-semibold">No activity yet</h3>
                <p className="text-sm text-muted-foreground">
                  Watch this quick tour to see how NotiProof collects, verifies, and shows social proof — then connect a source on the right.
                </p>
                <Button asChild size="sm" variant="outline"><Link to="/integrations">Connect a source</Link></Button>
              </div>
              <YouTubeEmbed audience="business" mode="inline" rounded="lg" caption="" />
            </div>
          ) : (
            <ul className="divide-y">
              {feed.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/proof/${p.id}`)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {(p.author_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">{p.author_name ?? "Anonymous"}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{p.source ?? p.type}</Badge>
                        {p.verified && <ShieldCheck className="h-3.5 w-3.5 text-teal" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{p.content ?? "—"}</div>
                    </div>
                    {p.rating && (
                      <span className="inline-flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-gold text-gold" /> {p.rating}
                      </span>
                    )}
                    <Badge variant={p.status === "approved" ? "default" : "secondary"} className="capitalize text-[10px]">{p.status}</Badge>
                    <span className="text-xs text-muted-foreground w-16 text-right">{timeAgo(p.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple" />
            <CardTitle className="text-base">AI content</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/content/review">Review queue{contentStats && contentStats.pending > 0 ? ` (${contentStats.pending})` : ""}</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/content">Library</Link></Button>
          </div>
        </CardHeader>
        <CardContent>
          {contentStats === null ? (
            <Skeleton className="h-12 w-full" />
          ) : contentStats.recent.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No AI content yet. Open a proof and click <span className="font-medium">Generate content</span> to start.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><span className="font-semibold text-foreground">{contentStats.pending}</span> pending review</span>
                <span><span className="font-semibold text-foreground">{contentStats.published_7d}</span> published in this period</span>
              </div>
              <ul className="divide-y">
                {contentStats.recent.map((c) => (
                  <li key={c.id}>
                    <Link to={`/content/${c.id}/edit`} className="flex items-center justify-between py-2 -mx-2 px-2 rounded-md hover:bg-muted/40 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] capitalize">{c.output_type?.replace(/_/g, " ")}</Badge>
                        <span className="truncate text-muted-foreground">Updated {timeAgo(c.updated_at)}</span>
                      </div>
                      <Badge variant={c.status === "published" ? "default" : "secondary"} className="text-[10px] capitalize">{c.status?.replace(/_/g, " ")}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Get started</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button variant="action" asChild className="h-auto py-4 flex-col items-start whitespace-normal text-left"><Link to="/integrations"><Plug className="h-5 w-5 mb-2 text-purple" /><div className="text-sm font-semibold">Connect a source</div><div className="text-xs text-muted-foreground mt-0.5">Stripe, Shopify, Google…</div></Link></Button>
          <Button variant="action" asChild className="h-auto py-4 flex-col items-start whitespace-normal text-left"><Link to="/proof/request"><MessageSquareQuote className="h-5 w-5 mb-2 text-accent" /><div className="text-sm font-semibold">Request a testimonial</div><div className="text-xs text-muted-foreground mt-0.5">Send a customer link</div></Link></Button>
          <Button variant="action" asChild className="h-auto py-4 flex-col items-start whitespace-normal text-left"><Link to="/widgets/new" onClick={(e) => { if (!trialGate.requireActive()) e.preventDefault(); }}><MonitorSmartphone className="h-5 w-5 mb-2 text-teal" /><div className="text-sm font-semibold">Build a widget</div><div className="text-xs text-muted-foreground mt-0.5">Floating, inline or badge</div></Link></Button>
          <Button variant="action" asChild className="h-auto py-4 flex-col items-start whitespace-normal text-left"><Link to="/content"><Sparkles className="h-5 w-5 mb-2 text-purple" /><div className="text-sm font-semibold">Generate content</div><div className="text-xs text-muted-foreground mt-0.5">Turn proof into posts</div></Link></Button>
        </CardContent>
      </Card>

    </div>
  );
}
