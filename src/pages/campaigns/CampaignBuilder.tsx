import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepName, type CampaignType } from "./components/StepName";
import { StepTrigger, type TriggerConfig } from "./components/StepTrigger";
import { StepRequest, type RequestConfig } from "./components/StepRequest";
import { StepReview } from "./components/StepReview";

const db = supabase as any;

const STEPS = ["Name & type", "Trigger", "Request", "Review"];

export default function CampaignBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBusinessId } = useAuth();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("post_purchase");
  const [trigger, setTrigger] = useState<TriggerConfig>({ delay_days: 14, min_order_value: 0 });
  const [request, setRequest] = useState<RequestConfig>({ reminder_enabled: true, reminder_delay_days: 5, prompt_questions: [] });

  useEffect(() => {
    if (!isEdit || !id) return;
    db.from("campaigns").select("*").eq("id", id).maybeSingle().then(({ data, error }: any) => {
      if (error || !data) {
        toast({ title: "Campaign not found", variant: "destructive" });
        navigate("/campaigns");
        return;
      }
      setName(data.name ?? "");
      setType(data.type as CampaignType);
      setTrigger((data.trigger_config ?? {}) as TriggerConfig);
      setRequest((data.request_config ?? {}) as RequestConfig);
      setLoading(false);
    });
  }, [id, isEdit, navigate, toast]);

  const canNext = (): boolean => {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) return (request.subject ?? "").trim().length > 0;
    return true;
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const save = async (activate: boolean) => {
    if (!currentBusinessId) return;
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      setStep(0);
      return;
    }
    if (!(request.subject ?? "").trim()) {
      toast({ title: "Email subject required", variant: "destructive" });
      setStep(2);
      return;
    }
    setSaving(true);
    const payload = {
      business_id: currentBusinessId,
      name: name.trim(),
      type,
      trigger_config: trigger,
      request_config: request,
      is_active: activate,
    };
    const result = isEdit
      ? await db.from("campaigns").update(payload).eq("id", id).select("id").maybeSingle()
      : await db.from("campaigns").insert(payload).select("id").maybeSingle();
    setSaving(false);
    if (result.error) {
      toast({ title: "Save failed", description: result.error.message, variant: "destructive" });
      return;
    }
    toast({ title: isEdit ? "Campaign updated" : activate ? "Campaign activated" : "Campaign saved as draft" });
    navigate(`/campaigns/${result.data?.id ?? id}`);
  };

  if (loading) {
    return <div className="container max-w-3xl py-8 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to campaigns
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit campaign" : "New campaign"}
        </h1>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "h-7 w-7 rounded-full border text-xs font-medium flex items-center justify-center shrink-0 transition-colors",
                i < step ? "bg-primary text-primary-foreground border-primary" :
                i === step ? "border-primary text-primary" : "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span className={cn("text-sm hidden sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && <StepName name={name} type={type} onChange={(p) => { if (p.name !== undefined) setName(p.name); if (p.type) setType(p.type); }} />}
          {step === 1 && <StepTrigger type={type} config={trigger} onChange={(p) => setTrigger((c) => ({ ...c, ...p }))} />}
          {step === 2 && <StepRequest type={type} config={request} onChange={(p) => setRequest((c) => ({ ...c, ...p }))} />}
          {step === 3 && <StepReview name={name} type={type} trigger={trigger} request={request} />}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={back} disabled={step === 0 || saving}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={!canNext()}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save as draft
            </Button>
            <Button onClick={() => save(true)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Activate campaign"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
