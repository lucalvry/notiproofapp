import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { planByKey } from "@/lib/plans";
import { domainSchema } from "@/lib/validation";

interface DomainRow {
  id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

function normalizeHost(raw: string): string {
  let v = raw.trim().toLowerCase();
  v = v.replace(/^[a-z]+:\/\//, "");
  v = v.replace(/\/.*$/, "");
  v = v.replace(/:\d+$/, "");
  v = v.replace(/^www\./, "");
  return v;
}

export function DomainsCard() {
  const { currentBusinessId, currentBusinessRole, businesses } = useAuth();
  const { toast } = useToast();
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const business = businesses.find((b) => b.id === currentBusinessId);
  const planKey = (business?.plan ?? business?.plan_tier ?? "free") as string;
  const plan = planByKey(planKey);

  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [removeRow, setRemoveRow] = useState<DomainRow | null>(null);

  const limit = plan.domainLimit;
  const limitReached = rows.length >= limit;

  const load = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("business_domains")
      .select("id, domain, is_primary, is_verified, verified_at, created_at")
      .eq("business_id", currentBusinessId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Failed to load domains", description: error.message, variant: "destructive" });
    setRows((data ?? []) as DomainRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currentBusinessId]);

  const verify = async (domain: string, rowId: string) => {
    if (!currentBusinessId) return;
    setVerifyingId(rowId);
    try {
      const { data, error } = await supabase.functions.invoke("verify-domain", {
        body: { url: `https://${domain}`, business_id: currentBusinessId },
      });
      if (error) {
        if (showRateLimitToastIf(error)) return;
        throw error;
      }
      const r = data as { verified: boolean; error?: string };
      if (r.verified) {
        toast({ title: "Verified", description: domain });
      } else {
        toast({ title: "Still not detected", description: r.error ?? "Add the script to your site and try again.", variant: "destructive" });
      }
      await load();
    } catch (e) {
      toast({ title: "Verification failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAdd = async () => {
    setAddError(null);
    if (!currentBusinessId || !canEdit) return;
    const host = normalizeHost(newDomain);
    const parsed = domainSchema.safeParse(host);
    if (!parsed.success) {
      setAddError(parsed.error.issues[0]?.message ?? "Enter a valid domain like mysite.com");
      return;
    }
    if (limitReached) return;
    setAdding(true);
    const { data: ins, error } = await (supabase as any)
      .from("business_domains")
      .insert({
        business_id: currentBusinessId,
        domain: host,
        is_primary: rows.length === 0,
        is_verified: false,
      })
      .select("id, domain")
      .single();
    setAdding(false);
    if (error) {
      if (error.code === "23505") setAddError("This domain is already added");
      else setAddError(error.message);
      return;
    }
    setNewDomain("");
    await load();
    if (ins?.id) await verify(host, ins.id);
  };

  const setPrimary = async (row: DomainRow) => {
    if (!currentBusinessId || !canEdit) return;
    // Clear current primary first to satisfy partial unique index.
    const current = rows.find((r) => r.is_primary);
    if (current && current.id !== row.id) {
      const { error: e1 } = await (supabase as any)
        .from("business_domains")
        .update({ is_primary: false })
        .eq("id", current.id);
      if (e1) return toast({ title: "Failed", description: e1.message, variant: "destructive" });
    }
    const { error } = await (supabase as any)
      .from("business_domains")
      .update({ is_primary: true })
      .eq("id", row.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Primary domain updated" });
    await load();
  };

  const confirmRemove = async () => {
    if (!removeRow) return;
    const { error } = await (supabase as any).from("business_domains").delete().eq("id", removeRow.id);
    setRemoveRow(null);
    if (error) return toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    toast({ title: "Domain removed" });
    await load();
  };

  const handleRemoveClick = (row: DomainRow) => {
    if (rows.length <= 1) {
      toast({ title: "Can't remove the only domain", description: "Add another domain first.", variant: "destructive" });
      return;
    }
    setRemoveRow(row);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Domains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your widget only renders on domains you add and verify here. Plan limit:{" "}
          <span className="font-medium text-foreground">
            {limit === Infinity ? "unlimited" : `${rows.length} / ${limit}`}
          </span>{" "}
          on the {plan.name} plan.
        </p>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
            No domains yet. Add your website below.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{row.domain}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {row.is_verified ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/15">
                        Unverified
                      </Badge>
                    )}
                    {row.is_primary && <Badge variant="outline">Primary</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!row.is_verified && (
                    <Button size="sm" variant="outline" disabled={!canEdit || verifyingId === row.id} onClick={() => verify(row.domain, row.id)}>
                      {verifyingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="ml-2">Verify now</span>
                    </Button>
                  )}
                  {row.is_verified && !row.is_primary && (
                    <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setPrimary(row)}>
                      <Star className="h-3.5 w-3.5 mr-2" /> Set as primary
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => handleRemoveClick(row)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 pt-2 border-t">
          {limitReached ? (
            <div className="text-sm rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              You've reached the {plan.name} plan limit of {limit === Infinity ? "unlimited" : limit} domain{limit === 1 ? "" : "s"}.{" "}
              <Link to="/settings/billing" className="font-medium underline">Upgrade your plan</Link> to add more.
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="e.g. mysite.com"
                value={newDomain}
                maxLength={253}
                autoComplete="url"
                onChange={(e) => { setNewDomain(e.target.value); setAddError(null); }}
                disabled={!canEdit || adding}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
              <Button onClick={handleAdd} disabled={!canEdit || adding || !newDomain.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-2">Add domain</span>
              </Button>
            </div>
          )}
          {addError && <div className="text-sm text-destructive">{addError}</div>}
        </div>

        <AlertDialog open={!!removeRow} onOpenChange={(o) => !o && setRemoveRow(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {removeRow?.is_primary ? "This is your primary domain. Are you sure?" : "Remove this domain?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                The widget will stop rendering on <span className="font-medium text-foreground">{removeRow?.domain}</span> immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}