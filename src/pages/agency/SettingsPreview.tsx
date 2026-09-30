import { Link } from "react-router-dom";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, MessageSquareQuote, Image as ImageIcon, BarChart3 } from "lucide-react";

/**
 * AGY-04 — interactive white-label preview.
 * Renders a mock client portal using the agency's saved branding so admins
 * can see what their clients will experience before going live.
 */
export default function AgencySettingsPreview() {
  const { agency } = useAgency();
  if (!agency) return null;

  const brand = agency.brand_color || "#2563eb";
  const portalUrl = agency.custom_subdomain && agency.subdomain_verified
    ? `https://${agency.custom_subdomain}`
    : `${window.location.origin}/portal/${agency.portal_slug || agency.slug}`;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to="/agency/settings"><ArrowLeft className="h-4 w-4 mr-1" />Back to settings</Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">White-label preview</h1>
          <p className="text-muted-foreground text-sm">This is what your clients see when they log into your portal.</p>
        </div>
        <Button variant="outline" asChild>
          <a href={portalUrl} target="_blank" rel="noreferrer">
            <Eye className="h-4 w-4 mr-1" />
            Open live portal
          </a>
        </Button>
      </div>

      <div className="text-xs text-muted-foreground font-mono break-all rounded-md border bg-secondary/40 p-3">
        {portalUrl}
      </div>

      {/* Mock browser frame */}
      <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
        <div className="h-9 bg-secondary/60 border-b flex items-center px-3 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-3 text-xs text-muted-foreground truncate">{portalUrl}</div>
        </div>

        {/* Portal mock */}
        <div className="min-h-[480px] bg-background" style={{ ["--brand-primary" as any]: brand }}>
          <header
            className="h-16 border-b flex items-center justify-between px-6"
            style={{ background: brand, color: "#fff" }}
          >
            <div className="flex items-center gap-3">
              {agency.logo_url ? (
                <img src={agency.logo_url} alt={agency.name} className="h-8 w-8 rounded bg-white/20 object-contain p-1" />
              ) : (
                <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center text-sm font-bold">
                  {agency.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="font-semibold">{agency.name}</div>
            </div>
            <div className="text-xs opacity-90">Client portal</div>
          </header>

          <div className="p-6 space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Welcome</div>
              <div className="text-xl font-semibold mt-1">
                {agency.portal_welcome_msg || "Welcome to your proof portal."}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <MockCard label="Proofs" value="48" icon={MessageSquareQuote} brand={brand} />
              <MockCard label="Content" value="12" icon={ImageIcon} brand={brand} />
              <MockCard label="Reach" value="3.2k" icon={BarChart3} brand={brand} />
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm">Recent proof</div>
                <Badge variant="outline">demo</Badge>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: brand }}
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                    <div>
                      <div className="font-medium">Customer name #{i}</div>
                      <div className="text-muted-foreground">"This service made all the difference for our team."</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="text-white"
              style={{ background: brand }}
            >
              View all proof
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Want to change something?</CardTitle>
          <CardDescription>Update colors, welcome message, or portal slug in branding settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/agency/settings">Open settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MockCard({ label, value, icon: Icon, brand }: { label: string; value: string; icon: any; brand: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4" style={{ color: brand }} />
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
