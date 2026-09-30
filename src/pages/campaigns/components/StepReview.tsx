import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CampaignType } from "./StepName";
import type { TriggerConfig } from "./StepTrigger";
import type { RequestConfig } from "./StepRequest";

interface Props {
  name: string;
  type: CampaignType;
  trigger: TriggerConfig;
  request: RequestConfig;
}

const TYPE_LABELS: Record<CampaignType, string> = {
  post_purchase: "Post-purchase",
  milestone: "Milestone",
  anniversary: "Anniversary",
  manual: "Manual",
};

export function StepReview({ name, type, trigger, request }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Overview</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <Row label="Name" value={name || <Empty />} />
          <Row label="Type" value={<Badge variant="outline">{TYPE_LABELS[type]}</Badge>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Trigger</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {type === "post_purchase" && (
            <>
              <Row label="Integration" value={trigger.integration_id ? "Specific integration" : "Any integration"} />
              <Row label="Delay" value={`${trigger.delay_days ?? 14} days`} />
              <Row label="Min. order value" value={`$${(trigger.min_order_value ?? 0).toFixed(2)}`} />
            </>
          )}
          {type === "milestone" && <Row label="Event" value={trigger.milestone_event ?? "milestone.reached"} />}
          {type === "anniversary" && <Row label="Anniversary" value={trigger.anniversary_month ?? "signup"} />}
          {type === "manual" && <p className="text-muted-foreground">No automatic trigger — sent on demand.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Email</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <Row label="Subject" value={request.subject || <Empty />} />
          <Row label="Message" value={request.message || <span className="text-muted-foreground">(none)</span>} />
          <Row
            label="Prompts"
            value={
              (request.prompt_questions?.length ?? 0) > 0
                ? <div className="flex flex-wrap gap-1">{request.prompt_questions!.map((q, i) => <Badge key={i} variant="secondary" className="text-[10px]">{q}</Badge>)}</div>
                : <span className="text-muted-foreground">(none)</span>
            }
          />
          <Row
            label="Reminder"
            value={request.reminder_enabled === false ? "Off" : `After ${request.reminder_delay_days ?? 5} days`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
function Empty() { return <span className="text-destructive">Required</span>; }
