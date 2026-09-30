import { Outlet, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  size = 20,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="rounded object-cover bg-muted shrink-0"
        style={{ width: size, height: size }}
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

function BusinessSwitcher() {
  const { businesses, currentBusinessId, setCurrentBusinessId, refresh } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const { state } = useSidebar();

  const current = businesses.find((b) => b.id === currentBusinessId);
  const ownedCount = businesses.filter((b) => b.role === "owner").length;
  const isFreePlan = (current?.plan_tier ?? "free") === "free";

  const switchTo = (id: string) => {
    if (id === currentBusinessId) return;
    setCurrentBusinessId(id);
    queryClient.clear();
    window.location.reload();
  };

  const handleAddNew = () => {
    if (isFreePlan && ownedCount >= 1) {
      setUpgradeOpen(true);
    } else {
      setCreateOpen(true);
    }
  };

  const createBusiness = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    const { data, error } = await supabase.rpc("create_business" as never, { _name: trimmed } as never);
    setCreating(false);
    if (error) return toast({ title: "Couldn't create business", description: error.message, variant: "destructive" });
    setName("");
    setCreateOpen(false);
    await refresh();
    if (typeof data === "string") setCurrentBusinessId(data);
    queryClient.clear();
    navigate("/onboarding/connect");
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
            {current && <BusinessAvatar name={current.name} logoUrl={current.logo_url} size={20} />}
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
              <BusinessAvatar name={b.name} logoUrl={b.logo_url} size={24} />
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createBusiness} disabled={creating || !name.trim()}>
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
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  const closeMobile = () => setOpenMobile(false);
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
                  <SidebarMenuButton asChild isActive={isActive(to)} tooltip={label}>
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <ProtectedRoute>
      <SidebarProvider defaultOpen>
        <MainSidebar onSignOut={handleSignOut} />
        <SidebarInset className="min-w-0">
          <ImpersonationBanner />
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-card px-3 md:px-4">
            <SidebarTrigger className="h-9 w-9" />
            <div className="flex items-center gap-1">
              <NotificationBell />
              <UserAvatarMenu onSignOut={handleSignOut} />
            </div>
          </header>
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
