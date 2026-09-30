import { Outlet, Link, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileBarChart,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";
import { UserAvatarMenu } from "./UserAvatarMenu";
import { useIdleLogout } from "@/hooks/useIdleLogout";

const nav = [
  { to: "/agency", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/agency/clients", label: "Clients", icon: Briefcase },
  { to: "/agency/team", label: "Team", icon: Users },
  { to: "/agency/reports", label: "Reports", icon: FileBarChart },
  { to: "/agency/billing", label: "Billing", icon: CreditCard },
  { to: "/agency/settings", label: "Settings", icon: Settings },
];

export function AgencyLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { agency, loading: agencyLoading } = useAgency();
  const navigate = useNavigate();
  useIdleLogout();

  if (authLoading || agencyLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!agency) return <Navigate to="/agency/signup" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <div className="h-16 flex items-center px-5 border-b">
          <Link to="/agency" className="text-lg font-bold tracking-tight">
            <span className="text-primary">Noti</span>
            <span className="text-accent">Proof</span>
            <span className="text-xs text-muted-foreground ml-2 font-normal">Agency OS</span>
          </Link>
        </div>
        <div className="px-3 py-3 border-b">
          <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-1">Agency</div>
          <div className="px-2 py-1.5 text-sm font-medium truncate">{agency.name}</div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6">
          <div className="md:hidden text-lg font-bold tracking-tight">
            <span className="text-primary">Noti</span>
            <span className="text-accent">Proof</span>
          </div>
          <div className="hidden md:block text-sm text-muted-foreground">
            Welcome back{agency.name ? `, ${agency.name}` : ""}
          </div>
          <UserAvatarMenu onSignOut={handleSignOut} />
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}