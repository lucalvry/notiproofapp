import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WizardProgress } from "@/components/onboarding/WizardProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, AlignStartVertical, Award, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PreviewRender } from "@/components/widgets/PreviewRender";

const widgetTypes = [
  { id: "floating" as const, name: "Floating", desc: "Slides in from the corner", icon: Bell },
  { id: "inline" as const, name: "Inline", desc: "Embedded on your page", icon: AlignStartVertical },
  { id: "badge" as const, name: "Badge", desc: "Compact trust badge", icon: Award },
];

export default function OnbWidget() {
  const [name, setName] = useState("My first widget");
  const [type, setType] = useState<typeof widgetTypes[number]["id"]>("floating");
  const [loading, setLoading] = useState(false);
  const { currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    const typeMap = { floating: "popup", inline: "inline", badge: "banner" } as const;
    const { data, error } = await (supabase as any)
      .from("widgets")
      .insert({
        business_id: currentBusinessId,
        name,
        type: typeMap[type],
        status: "draft",
        config: { variant: type, position: "bottom-left", interval_seconds: 6 },
      })
      .select("id")
      .single();
    if (error || !data) {
      setLoading(false);
      toast({ title: "Could not create widget", description: error?.message, variant: "destructive" });
      return;
    }
    // Persist onboarding completion per spec ONB-03
    await supabase.rpc("mark_business_onboarding_complete" as never, { _business_id: currentBusinessId } as never);
    setLoading(false);
    navigate(`/onboarding/complete?widget=${data.id}`);
  };

  return (
    <div className="animate-fade-in">
      <WizardProgress current={3} />
      <div className="text-center mb-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ONB-03</div>
        <h1 className="text-3xl font-bold mt-1">Preview your first widget</h1>
        <p className="text-muted-foreground mt-2">Choose how visitors will see your social proof.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="widget-name">Widget name</Label>
              <Input id="widget-name" value={name} onChange={(e) => setName(e.target.value)} required />
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
                      type === id ? "border-accent ring-2 ring-accent/20" : "border-border"
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
          </CardContent>
        </Card>

        <Card className="bg-secondary/40">
          <CardContent className="pt-6 h-full">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-3">Live preview</div>
            <div className="bg-card rounded-lg border h-72 flex items-center justify-center relative overflow-hidden">
              <PreviewRender
                variant={type}
                cfg={{ variant: type, position: "bottom-left", show_avatar: true, show_rating: true }}
                sample={null}
                showPoweredBy={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between gap-3 mt-6">
        <Button variant="outline" onClick={() => navigate("/onboarding/install")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleCreate} disabled={loading || !name} size="lg">
          {loading ? "Creating..." : "Create widget"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
