import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Menu,
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

function BusinessSwitcher({ inline = false }: { inline?: boolean }) {
  const { businesses, currentBusinessId, setCurrentBusinessId, refresh } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

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
            className={inline ? "w-full justify-start gap-2" : "gap-2 max-w-[180px]"}
          >
            {current && <BusinessAvatar name={current.name} logoUrl={current.logo_url} size={20} />}
            <span className="truncate text-sm font-medium">
              {current?.name ?? "Select business"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useIdleLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-background">
        <ImpersonationBanner />
        <header className="border-b bg-card sticky top-0 z-40">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 xl:gap-4 min-w-0">
              {/* Mobile / tablet hamburger */}
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="xl:hidden -ml-2 p-2" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>
                      <Link to="/dashboard" onClick={() => setDrawerOpen(false)} className="text-xl font-bold tracking-tight text-primary">
                        Noti<span className="text-accent">Proof</span>
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-3 border-b">
                    <BusinessSwitcher inline />
                  </div>
                  <nav className="p-3 flex flex-col gap-1">
                    {nav.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          }`
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </NavLink>
                    ))}
                    {profile?.is_admin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          }`
                        }
                      >
                        <Shield className="h-4 w-4" />
                        Admin
                      </NavLink>
                    )}
                    <div className="my-2 border-t" />
                    <NavLink
                      to="/settings/profile"
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`
                      }
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </NavLink>
                    <NavLink
                      to="/settings/billing"
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`
                      }
                    >
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </NavLink>
                    <NavLink
                      to="/settings/team"
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`
                      }
                    >
                      <Users className="h-4 w-4" />
                      Team
                    </NavLink>
                  </nav>
                  <div className="p-3 border-t mt-auto">
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Link to="/dashboard" className="text-xl font-bold tracking-tight text-primary shrink-0">
                Noti<span className="text-accent">Proof</span>
              </Link>

              {/* Business switcher (desktop) — left of nav */}
              <div className="hidden xl:block">
                <BusinessSwitcher />
              </div>

              <Separator orientation="vertical" className="hidden xl:block h-6" />

              {/* Desktop nav */}
              <nav className="hidden xl:flex items-center gap-1">
                {nav.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={label}
                    aria-label={label}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden 2xl:inline">{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Right cluster: admin shortcut + bell + avatar */}
            <div className="flex items-center gap-1">
              {profile?.is_admin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="hidden sm:flex gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                  aria-label="Open Admin Console"
                  title="Open Admin Console"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden 2xl:inline text-sm font-medium">Admin</span>
                </Button>
              )}
              <NotificationBell />
              <UserAvatarMenu onSignOut={handleSignOut} />
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}
