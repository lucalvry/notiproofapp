import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WizardProgress } from "@/components/onboarding/WizardProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PartyPopper, ArrowRight, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { YouTubeEmbed } from "@/components/video/YouTubeEmbed";

interface ChecklistItem {
  label: string;
  done: boolean;
}

export default function OnbComplete() {
  const navigate = useNavigate();
  const { currentBusinessId, refresh } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([
    { label: "Account created", done: true },
    { label: "Data source connected", done: false },
    { label: "Script installed", done: false },
    { label: "First widget created", done: false },
  ]);

  useEffect(() => {
    if (!currentBusinessId) return;
    let cancelled = false;
    (async () => {
      const [{ data: biz }, { count: integrationCount }, { count: widgetCount }] = await Promise.all([
        supabase.from("businesses").select("install_verified, settings").eq("id", currentBusinessId).maybeSingle(),
        supabase.from("integrations").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId),
        supabase.from("widgets").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId),
      ]);
      if (cancelled) return;
      const settings = (biz as { settings?: Record<string, unknown> | null } | null)?.settings ?? {};
      const verified = !!(biz as { install_verified?: boolean } | null)?.install_verified || !!settings.install_verified;
      setItems([
        { label: "Account created", done: true },
        { label: "Data source connected", done: (integrationCount ?? 0) > 0 },
        { label: "Script installed", done: verified },
        { label: "First widget created", done: (widgetCount ?? 0) > 0 },
      ]);
    })();
    return () => { cancelled = true; };
  }, [currentBusinessId]);

  // CSS confetti burst — generated once on mount.
  const confetti = useMemo(() => {
    const colors = ["hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--success))"];
    return Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1.4 + Math.random() * 1.2,
      color: colors[i % colors.length],
      rotate: Math.random() * 360,
      size: 6 + Math.random() * 6,
    }));
  }, []);

  const finish = async () => {
    if (currentBusinessId) {
      const { error } = await supabase.rpc(
        "mark_business_onboarding_complete" as never,
        { _business_id: currentBusinessId } as never,
      );
      if (error) {
        toast({ title: "Could not complete onboarding", description: error.message, variant: "destructive" });
        return;
      }
      await refresh();
    }
    navigate("/dashboard");
  };

  return (
    <div className="animate-fade-in">
      <WizardProgress current={4} />

      <div className="relative">
        {/* Confetti layer */}
        <div className="pointer-events-none absolute inset-x-0 -top-4 h-0 z-10">
          {confetti.map((c, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                background: c.color,
                width: `${c.size}px`,
                height: `${c.size * 0.4}px`,
                transform: `rotate(${c.rotate}deg)`,
              }}
            />
          ))}
        </div>

        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent mb-4">
              <PartyPopper className="h-8 w-8" />
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ONB-04</div>
            <h1 className="text-3xl font-bold mt-1">You're all set! 🎉</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Your account is ready. Here's what's done — head to the dashboard to start collecting and displaying social proof.
            </p>

            <ul className="mt-6 max-w-sm mx-auto text-left space-y-2">
              {items.map((item, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                    item.done ? "bg-accent/5 border-accent/30" : "bg-muted/30 border-border",
                  )}
                >
                  {item.done ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Circle className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 max-w-md mx-auto text-left">
              <p className="text-sm font-medium mb-2">A 75-second refresher on what's next:</p>
              <YouTubeEmbed audience="business" mode="inline" rounded="lg" caption="" />
            </div>

            <Button onClick={finish} size="lg" className="mt-6">
              Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
