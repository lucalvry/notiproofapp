import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  PortalBrandingProvider,
  usePortalBranding,
  detectPortalSubdomain,
} from "@/contexts/PortalBrandingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard, ShieldCheck, FileText, BarChart3, LogOut, Loader2 } from "lucide-react";

interface PortalClient {
  business_id: string;
  business_name: string;
  visible_features: string[];
}

interface PortalSessionCtx {
  agencyId: string;
  client: PortalClient | null;
  loading: boolean;
}

import { createContext, useContext } from "react";

const SessionCtx = createContext<PortalSessionCtx | undefined>(undefined);

export function usePortalSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("usePortalSession must be used inside PortalLayout");
  return ctx;
}

function PortalShell() {
  const { agency, loading, error } = usePortalBranding();
  const params = useParams<{ agency_slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [client, setClient] = useState<PortalClient | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  // Auth subscription
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Resolve client business for this user under this agency
  useEffect(() => {
    if (!agency || !userId) {
      setAccessChecked(authChecked && !userId);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("business_users")
        .select("business_id, businesses(id, name, account_type)")
        .eq("user_id", userId);
      const clientRows = (data ?? [])
        .map((r: any) => r.businesses)
        .filter((b: any) => b && b.account_type === "client");
      if (clientRows.length === 0) {
        if (!cancelled) {
          setClient(null);
          setAccessChecked(true);
        }
        return;
      }
      const { data: rels } = await supabase
        .from("agency_client_relationships")
        .select("client_business_id, visible_features, status")
        .eq("agency_id", agency.id)
        .eq("status", "active")
        .in(
          "client_business_id",
          clientRows.map((b: any) => b.id)
        );
      const match = (rels ?? [])[0];
      if (cancelled) return;
      if (!match) {
        setClient(null);
      } else {
        const biz = clientRows.find((b: any) => b.id === match.client_business_id);
        setClient({
          business_id: match.client_business_id,
          business_name: biz?.name ?? "Client",
          visible_features: (match.visible_features as string[]) ?? [],
        });
      }
      setAccessChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [agency, userId, authChecked]);

  // Redirect unauthenticated users to portal login (preserve current path).
  useEffect(() => {
    if (!agency) return;
    if (!authChecked) return;
    if (userId) return;
    const slug = params.agency_slug || agency.portal_slug || agency.slug;
    const isLogin = location.pathname.includes("/login");
    if (!isLogin) {
      navigate(`/portal/${slug}/login`, { replace: true, state: { from: location.pathname } });
    }
  }, [agency, authChecked, userId, params.agency_slug, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !agency) {
    return <PortalNotFound slug={params.agency_slug} />;
  }

  const brand = agency.brand_color || "#2563eb";
  const slug = params.agency_slug || agency.portal_slug || agency.slug;

  // Login page renders without sidebar
  const isLoginRoute = location.pathname.endsWith("/login");
  if (isLoginRoute) {
    return (
      <div className="min-h-screen bg-muted/30" style={{ ["--brand-primary" as any]: brand }}>
        <Outlet />
      </div>
    );
  }

  if (!userId || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessChecked && !client) {
    return <PortalAccessDenied agencyName={agency.name} onSignOut={() => supabase.auth.signOut()} />;
  }

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SessionCtx.Provider value={{ agencyId: agency.id, client, loading: false }}>
      <div className="min-h-screen flex flex-col" style={{ ["--brand-primary" as any]: brand }}>
        <header
          className="h-14 flex items-center justify-between px-6 text-white shadow-sm"
          style={{ background: brand }}
        >
          <Link to={`/portal/${slug}`} className="flex items-center gap-3">
            {agency.logo_url ? (
              <img
                src={agency.logo_url}
                alt={agency.name}
                className="h-8 w-8 rounded bg-white/15 object-contain p-1"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center text-sm font-bold">
                {agency.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="font-semibold">{agency.name}</div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {client && <span className="opacity-90 hidden sm:inline">{client.business_name}</span>}
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate(`/portal/${slug}/login`, { replace: true });
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </header>

        <div className="flex flex-1">
          <PortalSidebar slug={slug} features={client?.visible_features ?? []} />
          <main className="flex-1 p-6 overflow-auto bg-muted/20">
            <Outlet />
          </main>
        </div>
      </div>
    </SessionCtx.Provider>
  );
}

function PortalSidebar({ slug, features }: { slug: string; features: string[] }) {
  const items = [
    { to: `/portal/${slug}`, label: "Dashboard", icon: LayoutDashboard, key: "dashboard", end: true },
    { to: `/portal/${slug}/proof`, label: "Proof", icon: ShieldCheck, key: "proof" },
    { to: `/portal/${slug}/content`, label: "Content", icon: FileText, key: "content" },
    { to: `/portal/${slug}/analytics`, label: "Analytics", icon: BarChart3, key: "analytics" },
  ];
  const visible = features.length === 0 ? items : items.filter((i) => features.includes(i.key));

  return (
    <nav className="w-56 border-r bg-background py-4 hidden md:block">
      <ul className="space-y-1 px-3">
        {visible.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-muted font-medium" : "hover:bg-muted/60 text-muted-foreground"
                }`
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PortalNotFound({ slug }: { slug?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Portal not found</CardTitle>
          <CardDescription>
            No agency is registered at <code className="text-xs">{slug ? `/portal/${slug}` : window.location.hostname}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/login">Back to NotiProof</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PortalAccessDenied({ agencyName, onSignOut }: { agencyName: string; onSignOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>No access</CardTitle>
          <CardDescription>
            This account is not linked to a client of <strong>{agencyName}</strong>. Contact your agency
            administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function PortalLayout(): ReactNode {
  const params = useParams<{ agency_slug: string }>();
  const subdomain = detectPortalSubdomain();
  return (
    <PortalBrandingProvider
      slug={subdomain ? null : params.agency_slug ?? null}
      subdomain={subdomain}
    >
      <PortalShell />
    </PortalBrandingProvider>
  );
}
