import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, AlignStartVertical, Award, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const widgetTypes = [
  { id: "floating" as const, name: "Floating", desc: "Slides in from the corner", icon: Bell },
  { id: "inline" as const, name: "Inline", desc: "Embedded on your page", icon: AlignStartVertical },
  { id: "badge" as const, name: "Badge", desc: "Compact trust badge", icon: Award },
];

// Same type mapping and insert shape as src/pages/onboarding/Widget.tsx and WidgetEditor.
const typeMap = { floating: "popup", inline: "inline", badge: "banner" } as const;

interface Props {
  businessId: string | null;
  onSkip: () => void;
  onCreated: (widgetId: string) => void;
}

export function WidgetStep({ businessId, onSkip, onCreated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("My first widget");
  const [type, setType] = useState<typeof widgetTypes[number]["id"]>("floating");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("widgets")
      .insert({
        business_id: businessId,
        name,
        type: typeMap[type],
        status: "draft",
        config: { variant: type, position: "bottom-left", interval_seconds: 6 },
      })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) {
      toast({ title: "Could not create widget", description: error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Widget created" });
    onCreated(data.id as string);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gs-widget-name">Widget name</Label>
        <Input id="gs-widget-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Widget type</Label>
        <div className="grid grid-cols-1 gap-2">
          {widgetTypes.map(({ id, name: n, desc, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              className={cn(
                "text-left p-3 rounded-md border-2 flex items-start gap-3 transition-all hover:border-accent/60",
                type === id ? "border-accent ring-2 ring-accent/20" : "border-border",
              )}
            >
              <Icon className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <div className="font-medium text-sm">{n}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={create} disabled={loading || !name.trim() || !businessId}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Create widget
        </Button>
      </div>
    </div>
  );
}
