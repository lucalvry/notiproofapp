import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SIGNUP_REASONS, SIGNUP_SOURCES } from "@/lib/attribution";

const db = supabase as any;
const label = (list: readonly { value: string; label: string }[], v?: string | null) =>
  v ? list.find((x) => x.value === v)?.label ?? v : "—";

interface Member { user_id: string; role: string; email: string; full_name: string | null; created_at: string }
interface Domain { id: string; domain: string; is_primary: boolean; is_verified: boolean; created_at: string }
interface Widget { id: string; name: string; type: string; status: string }
interface Attribution { reason: string; reason_other: string | null; source: string; source_detail: string | null; referral_code: string | null }

/** Admin-only owner, team, domains and widgets for one business. */
export function BusinessPeopleCards({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [attr, setAttr] = useState<Attribution | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: bu }, { data: d }, { data: w }] = await Promise.all([
        db.from("business_users").select("user_id, role, created_at").eq("business_id", businessId),
        db.from("business_domains").select("id, domain, is_primary, is_verified, created_at").eq("business_id", businessId).order("is_primary", { ascending: false }),
        db.from("widgets").select("id, name, type, status").eq("business_id", businessId),
      ]);
      const ids = ((bu ?? []) as { user_id: string }[]).map((r) => r.user_id);
      const { data: users } = ids.length ? await db.from("users").select("id, email, full_name").in("id", ids) : { data: [] };
      const list: Member[] = ((bu ?? []) as any[]).map((r) => {
        const u = (users ?? []).find((x: any) => x.id === r.user_id);
        return { user_id: r.user_id, role: r.role, created_at: r.created_at, email: u?.email ?? r.user_id, full_name: u?.full_name ?? null };
      }).sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
      setMembers(list);
      setDomains((d ?? []) as Domain[]);
      setWidgets((w ?? []) as Widget[]);
      const owner = list.find((m) => m.role === "owner");
      if (owner) {
        const { data: a } = await db.from("signup_attribution").select("reason, reason_other, source, source_detail, referral_code").eq("user_id", owner.user_id).maybeSingle();
        setAttr((a as Attribution) ?? null);
      }
    })();
  }, [businessId]);

  const owner = members.find((m) => m.role === "owner");
  const nameFromEmail = !!owner && owner.email.split("@")[0].toLowerCase() === businessName.trim().toLowerCase();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Owner</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!owner ? <p className="text-muted-foreground">No owner found.</p> : (
            <>
              <div><span className="text-muted-foreground">Name: </span>{owner.full_name || "—"}</div>
              <div><span className="text-muted-foreground">Email: </span>
                <Link className="underline" to={`/admin/users?q=${encodeURIComponent(owner.email)}`}>{owner.email}</Link>
              </div>
              <div><span className="text-muted-foreground">Joined: </span>{new Date(owner.created_at).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Why they signed up: </span>{label(SIGNUP_REASONS, attr?.reason)}{attr?.reason_other ? ` — ${attr.reason_other}` : ""}</div>
              <div><span className="text-muted-foreground">Heard about us: </span>{label(SIGNUP_SOURCES, attr?.source)}{attr?.source_detail ? ` — ${attr.source_detail}` : ""}</div>
              {attr?.referral_code && <div><span className="text-muted-foreground">Referral code: </span>{attr.referral_code}</div>}
              {nameFromEmail && <Badge variant="outline">Business name was taken from the owner's email</Badge>}
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Domains</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {domains.length === 0 ? <p className="text-muted-foreground">No domain connected.</p> : domains.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2">
              <a className="underline" href={`https://${d.domain}`} target="_blank" rel="noreferrer">{d.domain}</a>
              {d.is_primary && <Badge>Primary</Badge>}
              <Badge variant={d.is_verified ? "default" : "secondary"}>{d.is_verified ? "Verified" : "Not verified"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Team ({members.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {members.map((m) => (
            <div key={m.user_id} className="flex justify-between gap-2">
              <span className="truncate">{m.full_name ? `${m.full_name} · ` : ""}{m.email}</span>
              <Badge variant="outline" className="capitalize">{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Widgets ({widgets.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {widgets.length === 0 ? <p className="text-muted-foreground">No widgets yet.</p> : widgets.map((w) => (
            <div key={w.id} className="flex justify-between gap-2">
              <span className="truncate">{w.name} <span className="text-muted-foreground">· {w.type.replace(/_/g, " ")}</span></span>
              <Badge variant={w.status === "active" ? "default" : "secondary"} className="capitalize">{w.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
