import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ContentSubNav } from "./components/ContentSubNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const db = supabase as any;

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface PublishEvent {
  id: string;
  content_piece_id: string;
  channel_id: string;
  scheduled_at: string | null;
  published_at: string | null;
  status: string;
  external_post_url: string | null;
  publishing_channels?: { provider: string; account_label: string | null } | null;
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: "hsl(var(--primary))",
  publishing: "hsl(var(--accent))",
  published: "hsl(142 70% 35%)",
  failed: "hsl(var(--destructive))",
  cancelled: "hsl(var(--muted-foreground))",
};

export default function PublishingCalendar() {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<PublishEvent[]>([]);
  const [selected, setSelected] = useState<PublishEvent | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");

  const load = () => {
    if (!currentBusinessId) return;
    db.from("content_publish_events")
      .select("id, content_piece_id, channel_id, scheduled_at, published_at, status, external_post_url, publishing_channels(provider, account_label)")
      .eq("business_id", currentBusinessId)
      .order("scheduled_at", { ascending: true })
      .then(({ data }: any) => setEvents((data as PublishEvent[]) ?? []));
  };

  useEffect(() => {
    load();
    if (!currentBusinessId) return;
    const ch = supabase
      .channel(`pub-cal-${currentBusinessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_publish_events", filter: `business_id=eq.${currentBusinessId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  const calEvents = useMemo(() => events.map((e) => {
    const at = e.published_at ?? e.scheduled_at ?? new Date().toISOString();
    const start = new Date(at);
    return {
      id: e.id,
      title: `${e.publishing_channels?.provider ?? "?"} · ${e.status}`,
      start,
      end: new Date(start.getTime() + 30 * 60 * 1000),
      resource: e,
    };
  }), [events]);

  const cancel = async () => {
    if (!selected) return;
    const { error } = await db.from("content_publish_events").update({ status: "cancelled" }).eq("id", selected.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Cancelled" });
    setSelected(null);
    load();
  };

  const reschedule = async () => {
    if (!selected || !rescheduleAt) return;
    const next = new Date(rescheduleAt);
    if (next <= new Date()) return toast({ title: "Pick a future time", variant: "destructive" });
    const { error } = await db.from("content_publish_events")
      .update({ scheduled_at: next.toISOString(), status: "scheduled" })
      .eq("id", selected.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Rescheduled" });
    setSelected(null);
    setRescheduleAt("");
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">PUB-02</div>
        <h1 className="text-3xl font-bold mt-1">Publishing calendar</h1>
        <p className="text-muted-foreground mt-1">Scheduled and published content across all channels.</p>
      </div>
      <ContentSubNav />
      <div style={{ height: 650 }} className="bg-card rounded-lg border p-2">
        <Calendar
          localizer={localizer}
          events={calEvents}
          startAccessor="start"
          endAccessor="end"
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          defaultView={Views.MONTH}
          eventPropGetter={(ev: any) => ({
            style: { backgroundColor: STATUS_COLOR[ev.resource.status] ?? "hsl(var(--primary))", border: 0 },
          })}
          onSelectEvent={(ev: any) => {
            setSelected(ev.resource);
            setRescheduleAt(ev.resource.scheduled_at?.slice(0, 16) ?? "");
          }}
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish event</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge>{selected.publishing_channels?.provider}</Badge>
                <Badge variant="outline" className="capitalize">{selected.status}</Badge>
              </div>
              <div className="text-muted-foreground">
                {selected.published_at
                  ? `Published ${new Date(selected.published_at).toLocaleString()}`
                  : selected.scheduled_at
                  ? `Scheduled for ${new Date(selected.scheduled_at).toLocaleString()}`
                  : "—"}
              </div>
              {selected.external_post_url && (
                <a href={selected.external_post_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  View post →
                </a>
              )}
              {(selected.status === "scheduled" || selected.status === "failed") && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs">Reschedule</Label>
                  <Input type="datetime-local" value={rescheduleAt} onChange={(e) => setRescheduleAt(e.target.value)} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected?.status === "scheduled" && (
              <Button variant="destructive" onClick={cancel}>Cancel</Button>
            )}
            {(selected?.status === "scheduled" || selected?.status === "failed") && (
              <Button onClick={reschedule}>Reschedule</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
