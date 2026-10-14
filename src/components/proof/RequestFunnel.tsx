import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

/** Sent → opened → submitted → approved, from real testimonial request rows. */
export function RequestFunnel({ businessId }: { businessId: string | null }) {
  const [f, setF] = useState<{ sent: number; opened: number; submitted: number; approved: number } | null>(null);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const { data } = await supabase
        .from("testimonial_requests")
        .select("sent_at, opened_at, responded_at, completed_at, proof_object_id, proof_objects(status)")
        .eq("business_id", businessId)
        .limit(1000);
      const rows = (data ?? []) as any[];
      const sent = rows.filter((r) => r.sent_at).length;
      const opened = rows.filter((r) => r.opened_at || r.responded_at || r.completed_at).length;
      const submitted = rows.filter((r) => r.responded_at || r.completed_at).length;
      const approved = rows.filter((r) => r.proof_objects?.status === "approved" && (r.responded_at || r.completed_at)).length;
      setF({ sent, opened, submitted, approved });
    })();
  }, [businessId]);

  if (!f) return null;
  const steps = [
    { label: "Sent", v: f.sent },
    { label: "Opened", v: f.opened },
    { label: "Submitted", v: f.submitted },
    { label: "Approved", v: f.approved },
  ];
  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <div key={s.label}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.v}</div>
            {i > 0 && (
              <div className="text-xs text-muted-foreground">
                {steps[i - 1].v ? `${Math.round((s.v / steps[i - 1].v) * 100)}% of ${steps[i - 1].label.toLowerCase()}` : "—"}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
