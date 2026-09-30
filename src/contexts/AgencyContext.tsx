import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AgencySummary {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  plan_tier: string;
  client_seat_limit: number;
  portal_slug: string | null;
  custom_subdomain: string | null;
  subdomain_verified: boolean;
  client_self_login: boolean;
  reseller_mode: boolean;
  portal_welcome_msg: string | null;
}

export type AgencyRole = "admin" | "member";

interface AgencyContextValue {
  agency: AgencySummary | null;
  role: AgencyRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
}

const AgencyContext = createContext<AgencyContextValue | undefined>(undefined);
const ACTIVE_CLIENT_KEY = "notiproof.active_client_id";

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [agency, setAgency] = useState<AgencySummary | null>(null);
  const [role, setRole] = useState<AgencyRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClientId, setActiveClientIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_CLIENT_KEY),
  );

  const setActiveClientId = (id: string | null) => {
    if (id) localStorage.setItem(ACTIVE_CLIENT_KEY, id);
    else localStorage.removeItem(ACTIVE_CLIENT_KEY);
    setActiveClientIdState(id);
    if (user) {
      supabase
        .from("users")
        .update({ active_client_id: id })
        .eq("id", user.id)
        .then(() => undefined);
    }
  };

  const load = async () => {
    if (!user) {
      setAgency(null);
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [membershipRes, userRes] = await Promise.all([
      supabase
        .from("agency_team_members")
        .select(
          "role, agency_id, agencies(id, name, slug, logo_url, brand_color, plan_tier, client_seat_limit, portal_slug, custom_subdomain, subdomain_verified, client_self_login, reseller_mode, portal_welcome_msg)",
        )
        .eq("user_id", user.id)
        .not("invitation_accepted_at", "is", null)
        .limit(1)
        .maybeSingle(),
      supabase.from("users").select("active_client_id").eq("id", user.id).maybeSingle(),
    ]);
    const { data, error } = membershipRes;
    if (error || !data || !data.agencies) {
      setAgency(null);
      setRole(null);
    } else {
      const ag = data.agencies as unknown as AgencySummary;
      setAgency(ag);
      setRole(data.role as AgencyRole);
    }
    if (!localStorage.getItem(ACTIVE_CLIENT_KEY) && userRes.data?.active_client_id) {
      localStorage.setItem(ACTIVE_CLIENT_KEY, userRes.data.active_client_id);
      setActiveClientIdState(userRes.data.active_client_id);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<AgencyContextValue>(
    () => ({ agency, role, loading, refresh: load, activeClientId, setActiveClientId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agency, role, loading, activeClientId],
  );

  return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>;
}

export function useAgency() {
  const ctx = useContext(AgencyContext);
  if (!ctx) throw new Error("useAgency must be used within AgencyProvider");
  return ctx;
}
