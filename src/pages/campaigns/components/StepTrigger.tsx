import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { CampaignType } from "./StepName";

const db = supabase as any;

export interface TriggerConfig {
  integration_id?: string | null;
  delay_days?: number;
  min_order_value?: number;
  milestone_event?: string;
  anniversary_month?: string;
}

interface Props {
  type: CampaignType;
  config: TriggerConfig;
  onChange: (patch: TriggerConfig) => void;
}

export function StepTrigger({ type, config, onChange }: Props) {
  const { currentBusinessId } = useAuth();
  const [integrations, setIntegrations] = useState<{ id: string; provider: string }[]>([]);

  useEffect(() => {
    if (!currentBusinessId || type !== "post_purchase") return;
    db.from("integrations")
      .select("id, provider")
      .eq("business_id", currentBusinessId)
      .then(({ data }: any) => setIntegrations((data as any[]) ?? []));
  }, [currentBusinessId, type]);

  if (type === "manual") {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Manual campaigns have no automatic trigger. You'll send requests on demand from the Proof
          library or from a single proof's detail screen.
        </AlertDescription>
      </Alert>
    );
  }

  if (type === "post_purchase") {
    const delay = config.delay_days ?? 14;
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Integration (optional)</Label>
          <Select
            value={config.integration_id ?? "any"}
            onValueChange={(v) => onChange({ integration_id: v === "any" ? null : v })}
          >
            <SelectTrigger><SelectValue placeholder="Any integration" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any integration</SelectItem>
              {integrations.map((i) => (
                <SelectItem key={i.id} value={i.id} className="capitalize">{i.provider}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Limit triggers to a specific connected source.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Delay before sending</Label>
            <span className="text-sm font-medium">{delay} days</span>
          </div>
          <Slider
            value={[delay]}
            min={0}
            max={60}
            step={1}
            onValueChange={([v]) => onChange({ delay_days: v })}
          />
          <p className="text-xs text-muted-foreground">Wait this long after the order before requesting a testimonial.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="min-order-value">Minimum order value</Label>
          <Input
            id="min-order-value"
            type="number"
            min={0}
            step="0.01"
            value={config.min_order_value ?? 0}
            onChange={(e) => onChange({ min_order_value: Number(e.target.value) || 0 })}
          />
          <p className="text-xs text-muted-foreground">Only trigger when the order is at or above this amount. Set to 0 for no minimum.</p>
        </div>
      </div>
    );
  }

  if (type === "milestone") {
    return (
      <div className="space-y-2">
        <Label>Milestone event</Label>
        <Select
          value={config.milestone_event ?? "milestone.reached"}
          onValueChange={(v) => onChange({ milestone_event: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="milestone.reached">Generic milestone reached</SelectItem>
            <SelectItem value="account.created">Account created</SelectItem>
            <SelectItem value="project.completed">Project completed</SelectItem>
            <SelectItem value="goal.completed">Goal completed</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Match this event type from your integration webhooks.</p>
      </div>
    );
  }

  // anniversary
  return (
    <div className="space-y-2">
      <Label>Anniversary</Label>
      <Select
        value={config.anniversary_month ?? "signup"}
        onValueChange={(v) => onChange({ anniversary_month: v })}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="signup">Signup anniversary</SelectItem>
          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
            <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
