import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PortalAgency {
  id: string;
  name: string;
  slug: string;
  portal_slug: string | null;
  brand_color: string | null;
  logo_url: string | null;
  portal_welcome_msg: string | null;
  custom_subdomain: string | null;
  subdomain_verified: boolean;
  client_self_login: boolean;
}

interface PortalBrandingContextValue {
  agency: PortalAgency | null;
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<PortalBrandingContextValue | undefined>(undefined);

const APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "notiproof.com",
  "www.notiproof.com",
  "app.notiproof.com",
]);

/** Returns the subdomain to look up, or null when on the main app host. */
export function detectPortalSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (APP_HOSTS.has(host)) return null;
  // Skip lovable preview / sandbox hosts.
  if (host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) return null;
  // Anything that's not the main app counts as a candidate subdomain.
  return host;
}

export function PortalBrandingProvider({
  slug,
  subdomain,
  children,
}: {
  slug?: string | null;
  subdomain?: string | null;
  children: ReactNode;
}) {
  const [agency, setAgency] = useState<PortalAgency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      let query = supabase
        .from("agencies")
        .select(
          "id, name, slug, portal_slug, brand_color, logo_url, portal_welcome_msg, custom_subdomain, subdomain_verified, client_self_login"
        );

      if (subdomain) {
        query = query.eq("custom_subdomain", subdomain).eq("subdomain_verified", true);
      } else if (slug) {
        query = query.or(`portal_slug.eq.${slug},slug.eq.${slug}`);
      } else {
        if (!cancelled) {
          setAgency(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message);
      setAgency((data as PortalAgency | null) ?? null);
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [slug, subdomain]);

  // Inject brand color as CSS var on the document for the whole portal subtree.
  useEffect(() => {
    if (!agency?.brand_color) return;
    const prev = document.documentElement.style.getPropertyValue("--brand-primary");
    document.documentElement.style.setProperty("--brand-primary", agency.brand_color);
    if (agency.name) document.title = `${agency.name} — Client Portal`;
    return () => {
      document.documentElement.style.setProperty("--brand-primary", prev);
    };
  }, [agency?.brand_color, agency?.name]);

  return <Ctx.Provider value={{ agency, loading, error }}>{children}</Ctx.Provider>;
}

export function usePortalBranding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortalBranding must be used inside PortalBrandingProvider");
  return ctx;
}
