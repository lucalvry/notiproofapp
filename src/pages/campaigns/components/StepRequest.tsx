import { useState, KeyboardEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Loader2, X } from "lucide-react";
import type { CampaignType } from "./StepName";

export interface RequestConfig {
  subject?: string;
  message?: string;
  prompt_questions?: string[];
  reminder_enabled?: boolean;
  reminder_delay_days?: number;
}

interface Props {
  type: CampaignType;
  config: RequestConfig;
  onChange: (patch: RequestConfig) => void;
}

export function StepRequest({ type, config, onChange }: Props) {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chip, setChip] = useState("");

  const questions = config.prompt_questions ?? [];

  const suggest = async () => {
    if (!currentBusinessId) return;
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-subject-lines", {
        body: { business_id: currentBusinessId, campaign_type: type },
      });
      if (error) throw error;
      const list: string[] = Array.isArray((data as any)?.suggestions) ? (data as any).suggestions : [];
      if (list.length === 0) toast({ title: "No suggestions returned", variant: "destructive" });
      setSuggestions(list);
    } catch (e: any) {
      toast({ title: "Failed to get suggestions", description: e?.message, variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  const addChip = () => {
    const v = chip.trim();
    if (!v) return;
    if (questions.includes(v)) { setChip(""); return; }
    onChange({ prompt_questions: [...questions, v].slice(0, 10) });
    setChip("");
  };

  const onChipKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip();
    }
  };

  const removeQ = (idx: number) =>
    onChange({ prompt_questions: questions.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Email subject</Label>
          <Button type="button" size="sm" variant="ghost" onClick={suggest} disabled={suggesting}>
            {suggesting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            Suggest subjects
          </Button>
        </div>
        <Input
          id="subject"
          value={config.subject ?? ""}
          onChange={(e) => onChange({ subject: e.target.value })}
          maxLength={120}
          placeholder="Mind sharing your experience?"
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ subject: s })}
                className="text-xs px-2 py-1 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Custom message (optional)</Label>
        <Textarea
          id="message"
          value={config.message ?? ""}
          onChange={(e) => onChange({ message: e.target.value })}
          maxLength={1000}
          rows={4}
          placeholder="Add a short personal note that appears above the testimonial form."
        />
      </div>

      <div className="space-y-2">
        <Label>Prompt questions (optional)</Label>
        <div className="flex gap-2">
          <Input
            value={chip}
            onChange={(e) => setChip(e.target.value)}
            onKeyDown={onChipKey}
            maxLength={140}
            placeholder="Type a question and press Enter"
          />
          <Button type="button" variant="outline" onClick={addChip}>Add</Button>
        </div>
        {questions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {questions.map((q, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                <span className="max-w-xs truncate">{q}</span>
                <button type="button" onClick={() => removeQ(i)} className="rounded hover:bg-background/50 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Up to 10 short questions shown to the customer on the collection page.</p>
      </div>

      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="reminder">Send a reminder</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Email a follow-up if there's no response.</p>
          </div>
          <Switch
            id="reminder"
            checked={config.reminder_enabled ?? true}
            onCheckedChange={(v) => onChange({ reminder_enabled: v })}
          />
        </div>
        {(config.reminder_enabled ?? true) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Reminder delay</Label>
              <span className="text-sm font-medium">{config.reminder_delay_days ?? 5} days</span>
            </div>
            <Slider
              value={[config.reminder_delay_days ?? 5]}
              min={1}
              max={30}
              step={1}
              onValueChange={([v]) => onChange({ reminder_delay_days: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
