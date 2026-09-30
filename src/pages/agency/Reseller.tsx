import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Info, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { useToast } from "@/hooks/use-toast";

/** Tiers offered to clients. Keep in sync with src/lib/plans.ts client-facing keys. */
const CLIENT_TIERS = [
  { key: "starter", label: "Starter", defaultCost: 29 },
  { key: "growth", label: "Growth", defaultCost: 79 },
  { key: "agency", label: "Agency", defaultCost: 199 },
];

type PricingMap = Record<string, { retail: number; cost: number }>;

export default function AgencyReseller() {
  const { agency, role } = useAgency();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<PricingMap>(() =>
    Object.fromEntries(CLIENT_TIERS.map((t) => [t.key, { retail: 0, cost: t.defaultCost }])),
  );
  const [collection, setCollection] = useState<"self" | "stripe_connect">("self");
  const [notes, setNotes] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (!agency) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agency_reseller_config")
        .select("id, pricing, payment_collection, notes")
        .eq("agency_id", agency.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setConfigId(data.id);
        const stored = (data.pricing ?? {}) as PricingMap;
        setPricing((prev) => {
          const next: PricingMap = { ...prev };
          for (const t of CLIENT_TIERS) {
            next[t.key] = {
              retail: Number(stored[t.key]?.retail ?? 0),
              cost: Number(stored[t.key]?.cost ?? t.defaultCost),
            };
          }
          return next;
        });
        setCollection((data.payment_collection as "self" | "stripe_connect") ?? "self");
        setNotes(data.notes ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [agency?.id]);

  const updateRow = (key: string, field: "retail" | "cost", value: string) => {
    const num = value === "" ? 0 : Number(value);
    if (Number.isNaN(num) || num < 0) return;
    setPricing((prev) => ({ ...prev, [key]: { ...prev[key], [field]: num } }));
  };

  const totals = useMemo(() => {
    let retail = 0;
    let cost = 0;
    for (const t of CLIENT_TIERS) {
      retail += pricing[t.key]?.retail ?? 0;
      cost += pricing[t.key]?.cost ?? 0;
    }
    return { retail, cost, margin: retail - cost };
  }, [pricing]);

  const save = async () => {
    if (!agency || !isAdmin) return;
    setSaving(true);
    try {
      const payload = {
        agency_id: agency.id,
        pricing: pricing as any,
        payment_collection: collection,
        notes: notes || null,
      };
      const { error } = configId
        ? await supabase.from("agency_reseller_config").update(payload).eq("id", configId)
        : await supabase.from("agency_reseller_config").insert(payload);
      if (error) throw error;
      // Mirror to agencies.reseller_mode so the dashboard can show the right state.
      await supabase
        .from("agencies")
        .update({ reseller_mode: true })
        .eq("id", agency.id);
      toast({ title: "Reseller config saved" });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!agency || loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/agency/billing")} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />Back to billing
      </Button>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ABILL-02</div>
        <h1 className="text-3xl font-bold mt-1">Reseller pricing</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Set the retail price you charge each client and the wholesale cost NotiProof bills you for that tier.
          We use these numbers to estimate your monthly margin per client.
        </p>
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <CardTitle className="text-sm">Manual collection (Phase 3)</CardTitle>
            <CardDescription className="text-xs">
              In Phase 3 you bill your clients yourself and pay NotiProof separately for their workspaces.
              Stripe Connect split-billing arrives in Phase 4.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-tier pricing</CardTitle>
          <CardDescription>Costs default to NotiProof list price. Override for your contract.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-3 text-xs uppercase tracking-wider text-muted-foreground font-mono px-1">
            <div className="col-span-4">Tier</div>
            <div className="col-span-3 text-right">Your retail / mo</div>
            <div className="col-span-3 text-right">Your cost / mo</div>
            <div className="col-span-2 text-right">Margin</div>
          </div>
          {CLIENT_TIERS.map((tier) => {
            const row = pricing[tier.key] ?? { retail: 0, cost: tier.defaultCost };
            const margin = row.retail - row.cost;
            return (
              <div key={tier.key} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4 font-medium">{tier.label}</div>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="pl-7 text-right"
                      value={row.retail || ""}
                      onChange={(e) => updateRow(tier.key, "retail", e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="pl-7 text-right"
                      value={row.cost || ""}
                      onChange={(e) => updateRow(tier.key, "cost", e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div
                  className={`col-span-2 text-right font-medium ${
                    margin > 0 ? "text-emerald-600" : margin < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  ${margin.toFixed(0)}
                </div>
              </div>
            );
          })}

          <div className="border-t pt-3 mt-2">
            <div className="grid grid-cols-12 gap-3 items-center font-semibold">
              <div className="col-span-4 flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                Total per client mix
              </div>
              <div className="col-span-3 text-right text-sm">${totals.retail.toFixed(2)}</div>
              <div className="col-span-3 text-right text-sm text-muted-foreground">${totals.cost.toFixed(2)}</div>
              <div className={`col-span-2 text-right text-sm ${totals.margin > 0 ? "text-emerald-600" : ""}`}>
                ${totals.margin.toFixed(2)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sum across all tiers — the actual revenue figure on{" "}
              <Link to="/agency/billing" className="underline">/agency/billing</Link> uses each client's actual tier.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment collection</CardTitle>
          <CardDescription>How you collect payment from your clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label>Collection mode</Label>
            <Select value={collection} onValueChange={(v) => setCollection(v as "self" | "stripe_connect")}>
              <SelectTrigger disabled={!isAdmin}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">I bill my clients manually</SelectItem>
                <SelectItem value="stripe_connect" disabled>
                  Stripe Connect split billing (Phase 4)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Internal notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything to remember about your pricing terms"
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/agency/billing")}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving || !isAdmin}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save reseller config
        </Button>
      </div>
    </div>
  );
}
