import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil, Mail, Eye, MessageSquare, Percent } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const db = supabase as any;

const TYPE_LABELS: Record<string, string> = {
  post_purchase: "Post-purchase",
  milestone: "Milestone",
  anniversary: "Anniversary",
  manual: "Manual",
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBusinessId } = useAuth();

  const [campaign, setCampaign] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sent: 0, opened: 0, responded: 0 });

  useEffect(() => {
    if (!id || !currentBusinessId) return;
    setLoading(true);
    Promise.all([
      db.from("campaigns").select("*").eq("id", id).maybeSingle(),
      db.from("testimonial_requests").select("id, recipient_email, recipient_name, status, sent_at, opened_at, responded_at, created_at").eq("campaign_id", id).order("created_at", { ascending: false }).limit(50),
      db.from("integration_events").select("id, event_type, received_at, status, payload").eq("business_id", currentBusinessId).order("received_at", { ascending: false }).limit(20),
    ]).then(([cRes, rRes, eRes]: any[]) => {
      setCampaign(cRes.data);
      const reqs = (rRes.data ?? []) as any[];
      setRequests(reqs);
      setEvents((eRes.data ?? []) as any[]);
      const sent = reqs.filter((r) => r.sent_at).length;
      const opened = reqs.filter((r) => r.opened_at).length;
      const responded = reqs.filter((r) => r.responded_at).length;
      setStats({ sent, opened, responded });
      setLoading(false);
    });
  }, [id, currentBusinessId]);

  const toggleActive = async (next: boolean) => {
    if (!campaign) return;
    setCampaign({ ...campaign, is_active: next });
    const { error } = await db.from("campaigns").update({ is_active: next }).eq("id", campaign.id);
    if (error) {
      setCampaign({ ...campaign, is_active: !next });
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="container max-w-5xl py-8 space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container max-w-3xl py-12 text-center">
        <p className="text-muted-foreground">Campaign not found.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/campaigns">Back to campaigns</Link></Button>
      </div>
    );
  }

  const conversion = stats.sent > 0 ? Math.round((stats.responded / stats.sent) * 100) : 0;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> All campaigns
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{TYPE_LABELS[campaign.type] ?? campaign.type}</Badge>
              <Badge variant={campaign.is_active ? "default" : "secondary"}>
                {campaign.is_active ? "Active" : "Paused"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active</span>
              <Switch checked={campaign.is_active} onCheckedChange={toggleActive} />
            </div>
            <Button asChild variant="outline">
              <Link to={`/campaigns/${campaign.id}/edit`}><Pencil className="h-4 w-4 mr-1.5" /> Edit</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Mail} label="Requests sent" value={stats.sent} />
        <Stat icon={Eye} label="Opened" value={stats.opened} />
        <Stat icon={MessageSquare} label="Responded" value={stats.responded} />
        <Stat icon={Percent} label="Conversion" value={`${conversion}%`} />
      </div>

      {/* Activity */}
      <Card>
        <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">No requests sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Responded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.recipient_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.recipient_email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.sent_at ? formatDistanceToNow(new Date(r.sent_at), { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.opened_at ? formatDistanceToNow(new Date(r.opened_at), { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.responded_at ? formatDistanceToNow(new Date(r.responded_at), { addSuffix: true }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent integration events */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent integration events</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent events.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <span className="font-mono text-xs">{e.event_type}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">{e.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.received_at), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
