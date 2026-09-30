import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, resetUser } from "@/lib/analytics";

type AppRole = "owner" | "editor" | "viewer";

interface BusinessSummary {
  id: string;
  name: string;
  role: AppRole;
  install_verified?: boolean;
  suspended_at?: string | null;
  logo_url?: string | null;
  /** Plan column on `businesses`. */
  plan?: string | null;
  /** Legacy alias kept for older components reading `plan_tier`. */
  plan_tier?: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
}

interface ImpersonationState {
  businessId: string;
  businessName: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  businesses: BusinessSummary[];
  currentBusinessId: string | null;
  currentBusinessRole: AppRole | null;
  loading: boolean;
  setCurrentBusinessId: (id: string) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** When set by a platform admin, the app behaves as if currentBusinessId
   *  is this business and the role is forced to viewer (read-only). */
  impersonation: ImpersonationState | null;
  startImpersonation: (businessId: string, businessName: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const IMPERSONATION_KEY = "notiproof.impersonation";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(
    () => localStorage.getItem("notiproof.current_business_id")
  );
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(() => {
    try {
      const raw = localStorage.getItem(IMPERSONATION_KEY);
      return raw ? (JSON.parse(raw) as ImpersonationState) : null;
    } catch {
      return null;
    }
  });

  const setCurrentBusinessId = (id: string) => {
    localStorage.setItem("notiproof.current_business_id", id);
    setCurrentBusinessIdState(id);
  };

  const startImpersonation = (businessId: string, businessName: string) => {
    const next = { businessId, businessName };
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(next));
    setImpersonation(next);
  };

  const stopImpersonation = () => {
    localStorage.removeItem(IMPERSONATION_KEY);
    setImpersonation(null);
  };

  const loadUserData = async (userId: string) => {
    const [{ data: profileData }, { data: membershipData }] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("business_users")
        .select("role, business_id, businesses(id, name, install_verified, logo_url, plan)")
        .eq("user_id", userId),
    ]);

    setProfile((profileData as UserProfile | null) ?? null);

    const list: BusinessSummary[] = (membershipData ?? [])
      .map((row: any) => row.businesses ? {
        id: row.businesses.id,
        name: row.businesses.name,
        role: row.role as AppRole,
        install_verified: row.businesses.install_verified,
        suspended_at: row.businesses.suspended_at ?? null,
        logo_url: row.businesses.logo_url,
        plan: row.businesses.plan ?? null,
        plan_tier: row.businesses.plan ?? null,
      } : null)
      .filter(Boolean) as BusinessSummary[];
    setBusinesses(list);

    if (list.length > 0) {
      const stored = localStorage.getItem("notiproof.current_business_id");
      const valid = stored && list.some((b) => b.id === stored) ? stored : list[0].id;
      if (valid !== stored) localStorage.setItem("notiproof.current_business_id", valid);
      setCurrentBusinessIdState(valid);
    } else {
      setCurrentBusinessIdState(null);
    }
  };

  useEffect(() => {
    // Set up listener BEFORE checking session
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer DB calls to avoid deadlocks
        setTimeout(() => loadUserData(newSession.user.id), 0);
      } else {
        setProfile(null);
        setBusinesses([]);
        setCurrentBusinessIdState(null);
        // Sign-out also clears impersonation.
        localStorage.removeItem(IMPERSONATION_KEY);
        setImpersonation(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadUserData(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadUserData(user.id);
  };

  const signOut = async () => {
    localStorage.removeItem("notiproof.current_business_id");
    localStorage.removeItem(IMPERSONATION_KEY);
    setImpersonation(null);
    resetUser();
    await supabase.auth.signOut();
  };

  // When an admin impersonates, override the current business and force the
  // role to viewer regardless of any real membership the admin has.
  const isAdmin = profile?.is_admin === true;
  const effectiveBusinessId = useMemo(() => {
    if (isAdmin && impersonation) return impersonation.businessId;
    return currentBusinessId;
  }, [isAdmin, impersonation, currentBusinessId]);

  const effectiveRole: AppRole | null = useMemo(() => {
    if (isAdmin && impersonation) return "viewer";
    return businesses.find((b) => b.id === currentBusinessId)?.role ?? null;
  }, [isAdmin, impersonation, businesses, currentBusinessId]);

  // Identify (or opt out) for Sentry + PostHog whenever the effective
  // identity changes. Admins and active impersonation are excluded from
  // PostHog capture and tagged `internal:true` in Sentry.
  useEffect(() => {
    if (!user) {
      resetUser();
      return;
    }
    identifyUser({
      id: user.id,
      email: profile?.email ?? user.email ?? null,
      isAdmin: profile?.is_admin === true,
      isImpersonating: !!impersonation,
      businessId: effectiveBusinessId,
    });
  }, [user, profile?.email, profile?.is_admin, impersonation, effectiveBusinessId]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        businesses,
        currentBusinessId: effectiveBusinessId,
        currentBusinessRole: effectiveRole,
        loading,
        setCurrentBusinessId,
        signOut,
        refresh,
        impersonation: isAdmin ? impersonation : null,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
