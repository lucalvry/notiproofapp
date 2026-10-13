import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { APP_URL } from "@/lib/app-url";
import { formatCents, pendingCommissionTotal, REFERRAL_COMMISSION_RATE } from "@/lib/referrals";
import { Copy } from "lucide-react";

interface Commission { status: string; commission_cents: number; currency: string }

export default function ReferralsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [clicks, setClicks] = useState(0);
  const [referrals, setReferrals] = useState<{ status: string }[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [method, setMethod] = useState("paypal");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.rpc("get_my_referral_code" as never);
      setCode((c as string) ?? null);
      const [{ data: rc }, { data: refs }, { data: com }, { data: pay }] = await Promise.all([
        supabase.from("referral_codes" as never).select("clicks").eq("user_id", user.id).maybeSingle(),
        supabase.from("referrals" as never).select("status").eq("referrer_user_id", user.id),
        supabase.from("referral_commissions" as never).select("status, commission_cents, currency").eq("referrer_user_id", user.id),
        supabase.from("referral_payout_details" as never).select("method, details").eq("user_id", user.id).maybeSingle(),
      ]);
      setClicks((rc as { clicks: number } | null)?.clicks ?? 0);
      setReferrals((refs as { status: string }[]) ?? []);
      setCommissions((com as Commission[]) ?? []);
      const p = pay as { method: string; details: string } | null;
      if (p) { setMethod(p.method); setDetails(p.details); }
    })();
  }, [user]);

  const link = code ? `${APP_URL}/register?ref=${code}` : "";
  const currency = commissions[0]?.currency ?? "usd";
  const earned = commissions.filter((c) => c.status !== "reversed").reduce((s, c) => s + c.commission_cents, 0);
  const paid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commission_cents, 0);
  const pending = pendingCommissionTotal(commissions);
  const paying = referrals.filter((r) => r.status === "paying").length;

  const savePayout = async () => {
    if (!user || !details.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("referral_payout_details" as never)
      .upsert({ user_id: user.id, method, details: details.trim() } as never, { onConflict: "user_id" });
    setSaving(false);
    toast(error ? { title: "Couldn't save payout details", description: error.message, variant: "destructive" } : { title: "Payout details saved" });
  };

  const stats = [
    { label: "Link clicks", value: clicks },
    { label: "Signed up", value: referrals.length },
    { label: "Paying customers", value: paying },
    { label: "Earned", value: formatCents(earned, currency) },
    { label: "Pending payout", value: formatCents(pending, currency) },
    { label: "Paid out", value: formatCents(paid, currency) },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Earn {Math.round(REFERRAL_COMMISSION_RATE * 100)}% every month</CardTitle>
          <CardDescription>
            Share your link. You earn {Math.round(REFERRAL_COMMISSION_RATE * 100)}% of every subscription payment from people you refer, for as long as they stay subscribed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={link} aria-label="Your referral link" />
          <Button variant="outline" disabled={!link} onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Link copied" }); }}>
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How you get paid</CardTitle>
          <CardDescription>Commissions are paid out by the NotiProof team. Refunded payments are removed from your earnings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout">{method === "paypal" ? "PayPal email" : "Bank name, account name and number"}</Label>
            <Input id="payout" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <Button onClick={savePayout} disabled={saving || !details.trim()}>{saving ? "Saving..." : "Save"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
