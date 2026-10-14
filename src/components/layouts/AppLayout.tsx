import { useTrialGate } from "@/hooks/useTrialGate";
import { TrialCountdown } from "@/components/billing/TrialCountdown";
import { TrialUpgradeDialog } from "@/components/billing/TrialUpgradeDialog";
import { Outlet, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/lib/plan-helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  MessageSquareQuote,
  Sparkles,
  Megaphone,
  FileText,
  MonitorSmartphone,
  Plug,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Check,
  Plus,
  ChevronDown,
  CreditCard,
  Users,
  Compass,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { NotificationBell } from "./NotificationBell";
import { UserAvatarMenu } from "./UserAvatarMenu";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { NotiProofBrand } from "@/components/brand/NotiProofBrand";
import { PageIntro, helpFor } from "@/components/help/PageIntro";
import { triggerSiteAnalysis } from "@/components/onboarding/GuidedSetup/utils";
import { GuidedSetupProvider, GuidedSetupDialog, useGuidedSetup, useSetupStatus, firstIncompleteStep } from "@/components/onboarding/GuidedSetup";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/proof", label: "Proof", icon: MessageSquareQuote },
  { to: "/content", label: "Content", icon: Sparkles },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/case-studies", label: "Case Studies", icon: FileText },
  { to: "/widgets", label: "Widgets", icon: MonitorSmartphone },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

function BusinessAvatar({
  name,
  logoUrl,
  faviconUrl,
  size = 20,
}: {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const imgSrc = faviconUrl || logoUrl;
  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt=""
        className="rounded object-cover bg-muted shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          // Favicon/logo 404s shouldn't leave a broken image icon — fall back to initials.
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className="rounded bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: "owner" | "editor" | "viewer" }) {
  const variant: "default" | "secondary" | "outline" =
    role === "owner" ? "default" : role === "editor" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="capitalize text-[10px] h-4 px-1.5 font-medium">
      {role}
    </Badge>
  );
}

/** Normalizes a business website into https://host form, or returns null if invalid. */
function normalizeWebsite(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return null;
    if (/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1)/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function BusinessSwitcher() {
  const { businesses, currentBusinessId, setCurrentBusinessId, refresh } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { state } = useSidebar();
  const guided = useGuidedSetup();
  const websiteRef = useRef<HTMLInputElement>(null);

  const current = businesses.find((b) => b.id === currentBusinessId);
  const ownedCount = businesses.filter((b) => b.role === "owner").length;
  const { plan: effectivePlan } = usePlan();
  const trialGate = useTrialGate();
  // Super admins get ADMIN_PLAN from usePlan (unless previewing a test plan).
  const isFreePlan = effectivePlan.key === "free" && effectivePlan.proofLimit !== Infinity;

  const switchTo = (id: string) => {
    if (id === currentBusinessId) return;
    setCurrentBusinessId(id);
    queryClient.clear();
    window.location.reload();
  };

  const handleAddNew = () => {
    if (!trialGate.requireActive()) return;
    if (isFreePlan && ownedCount >= 1) {
      setUpgradeOpen(true);
    } else {
      guided.open("business-new");
    }
  };

  const createBusiness = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const normalizedWebsite = normalizeWebsite(website);
    if (!normalizedWebsite) {
      setWebsiteError("Enter your website address, e.g. acme.com");
      websiteRef.current?.focus();
      return;
    }
    setWebsiteError(null);
    setCreating(true);
    const { data, error } = await supabase.rpc("create_business" as never, { _name: trimmed } as never);
    if (error) {
      setCreating(false);
      return toast({ title: "Couldn't create business", description: error.message, variant: "destructive" });
    }
    const newId = typeof data === "string" ? data : null;
    if (newId) {
      await supabase.from("businesses").update({ website_url: normalizedWebsite }).eq("id", newId);
    }
    setCreating(false);
    setName("");
    setWebsite("");
    setCreateOpen(false);
    await refresh();
    if (newId) {
      setCurrentBusinessId(newId);
      void triggerSiteAnalysis(newId, normalizedWebsite, toast).then(() => refresh());
    }
    queryClient.clear();
    // Continue in the guided setup popup (same flow for every business).
    guided.open("connect");
    if (newId) guided.setBusinessId(newId);
  };

  if (businesses.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 overflow-hidden px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-1.5"
            title={state === "collapsed" ? current?.name ?? "Select business" : undefined}
          >
            {current && <BusinessAvatar name={current.name} logoUrl={current.logo_url} faviconUrl={(current as any).favicon_url} size={20} />}
            <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
              {current?.name ?? "Select business"}
            </span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs uppercase text-muted-foreground tracking-wider">
            Your businesses
          </DropdownMenuLabel>
          {businesses.map((b) => (
            <DropdownMenuItem key={b.id} onClick={() => switchTo(b.id)} className="gap-2 py-2">
              <BusinessAvatar name={b.name} logoUrl={b.logo_url} faviconUrl={(b as any).favicon_url} size={24} />
              <span className="truncate flex-1">{b.name}</span>
              <RoleBadge role={b.role} />
              <Check className={`h-4 w-4 shrink-0 ${b.id === currentBusinessId ? "opacity-100" : "opacity-0"}`} />
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add new business
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new business</DialogTitle>
            <DialogDescription>You'll become the owner. We'll take you to onboarding next.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-business-website">
              Website <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-business-website"
              ref={websiteRef}
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                if (websiteError) setWebsiteError(null);
              }}
              placeholder="acme.com"
              autoFocus={!name.trim()}
            />
            <p className="text-xs text-muted-foreground">
              Your website address, e.g. acme.com — we read it to learn about your business.
            </p>
            {websiteError && <p className="text-xs text-destructive">{websiteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createBusiness} disabled={creating || !name.trim() || !website.trim()}>
              {creating ? "Creating…" : "Create business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to add another business</DialogTitle>
            <DialogDescription>
              Adding multiple businesses requires a Starter plan or above.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setUpgradeOpen(false);
                navigate("/settings/billing");
              }}
            >
              Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MainSidebar({ onSignOut }: { onSignOut: () => void }) {
  const { profile, currentBusinessId } = useAuth();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const guided = useGuidedSetup();
  const { counts: setupCounts } = useSetupStatus(currentBusinessId);

  const closeMobile = () => setOpenMobile(false);
  // Old wizard URLs and deep links land here as /dashboard?setup=<step>.
  const navigateMain = useNavigate();
  const { search } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const s = params.get("setup");
    if (!s) return;
    params.delete("setup");
    navigateMain({ pathname, search: params.toString() }, { replace: true });
    guided.open(s === "auto" ? firstIncompleteStep(setupCounts) : (s as Parameters<typeof guided.open>[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const openGuidedSetup = () => {
    closeMobile();
    guided.open(firstIncompleteStep(setupCounts));
  };
  const isActive = (to: string) => pathname === to || (to !== "/dashboard" && pathname.startsWith(`${to}/`));
  const settings = [
    { to: "/settings/profile", label: "Settings", icon: Settings },
    { to: "/settings/billing", label: "Billing", icon: CreditCard },
    { to: "/settings/team", label: "Team", icon: Users },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
        <Link to="/dashboard" onClick={closeMobile} className="flex h-10 w-full items-center overflow-hidden group-data-[collapsible=icon]:h-8">
          <NotiProofBrand variant="sidebar" />
        </Link>
        <BusinessSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={isActive(to)} tooltip={helpFor(to)?.body ?? label}>
                    <NavLink to={to} onClick={closeMobile}>
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settings.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(to)} tooltip={label}>
                    <NavLink to={to} onClick={closeMobile}>
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Guided setup" onClick={openGuidedSetup}>
                  <Compass />
                  <span>Guided setup</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {profile?.is_admin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")} tooltip="Admin">
                    <NavLink to="/admin" onClick={closeMobile}>
                      <Shield />
                      <span>Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={onSignOut}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  useIdleLogout();
  const isDashboard = useLocation().pathname === "/dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <ProtectedRoute>
      <GuidedSetupProvider>
      <GuidedSetupDialog />
      <TrialUpgradeDialog />
      <SidebarProvider defaultOpen>
        <MainSidebar onSignOut={handleSignOut} />
        <SidebarInset className="min-w-0">
          <ImpersonationBanner />
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-card px-3 md:px-4">
            <div className="flex items-center gap-1">
              <SidebarTrigger className="h-9 w-9" />
              <PageIntro />
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <UserAvatarMenu onSignOut={handleSignOut} />
            </div>
          </header>
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
            {!isDashboard && <div className="mb-4"><TrialCountdown compact /></div>}
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
      </GuidedSetupProvider>
    </ProtectedRoute>
  );
}
