import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Trophy, Calendar, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignType = "post_purchase" | "milestone" | "anniversary" | "manual";

const TYPES: { id: CampaignType; label: string; description: string; icon: typeof ShoppingBag }[] = [
  { id: "post_purchase", label: "Post-purchase", description: "Trigger after a successful order or payment.", icon: ShoppingBag },
  { id: "milestone", label: "Milestone", description: "Trigger when a customer reaches a goal.", icon: Trophy },
  { id: "anniversary", label: "Anniversary", description: "Trigger yearly on signup or a chosen date.", icon: Calendar },
  { id: "manual", label: "Manual", description: "Send requests on demand from the proof screens.", icon: Hand },
];

interface Props {
  name: string;
  type: CampaignType;
  onChange: (patch: { name?: string; type?: CampaignType }) => void;
}

export function StepName({ name, type, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign name</Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={100}
          placeholder="e.g. Post-purchase follow-up"
        />
      </div>
      <div className="space-y-2">
        <Label>Campaign type</Label>
        <div className="grid sm:grid-cols-2 gap-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ type: t.id })}
              className={cn(
                "text-left",
                "rounded-md border bg-card transition-colors",
                type === t.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
              )}
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="pt-4 flex gap-3">
                  <t.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
