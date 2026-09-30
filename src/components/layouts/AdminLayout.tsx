import { useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ImpersonationBanner } from "./ImpersonationBanner";
import {
  LayoutDashboard,
  Building2,
  HeartPulse,
  ShieldAlert,
  LogOut,
  ArrowLeft,
  Menu,
} from "lucide-react";

const adminNav = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/businesses", label: "Businesses", icon: Building2 },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { to: "/admin/health", label: "Health", icon: HeartPulse },
];

export function AdminLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  useIdleLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {adminNav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </>
  );

  const SidebarFooter = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="p-4 border-t border-sidebar-border space-y-1">
      <div className="px-3 py-2 text-xs opacity-70 truncate">{profile?.email}</div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={() => {
          onNavigate?.();
          navigate("/dashboard");
        }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to app
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={async () => {
          onNavigate?.();
          await handleSignOut();
        }}
      >
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );

  return (
    <AdminRoute>
      <ImpersonationBanner />
      <div className="min-h-screen flex bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-col">
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/admin/dashboard" className="text-xl font-bold">
              Noti<span className="text-sidebar-primary">Proof</span>
            </Link>
            <div className="text-xs uppercase tracking-wider mt-1 opacity-70">Admin</div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavLinks />
          </nav>
          <SidebarFooter />
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header className="md:hidden flex items-center justify-between px-4 h-14 border-b bg-sidebar text-sidebar-foreground">
            <Link to="/admin/dashboard" className="font-bold">
              Noti<span className="text-sidebar-primary">Proof</span>
              <span className="ml-1 text-xs opacity-70 uppercase tracking-wider">Admin</span>
            </Link>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col"
              >
                <div className="p-6 border-b border-sidebar-border">
                  <div className="text-xl font-bold">
                    Noti<span className="text-sidebar-primary">Proof</span>
                  </div>
                  <div className="text-xs uppercase tracking-wider mt-1 opacity-70">Admin</div>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                </nav>
                <SidebarFooter onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </header>

          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminRoute>
  );
}
