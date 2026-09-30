import { Outlet, Link, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/contexts/AgencyContext";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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
  const { pathname } = useLocation();
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

  const AgencySidebar = () => {
    const { setOpenMobile } = useSidebar();
    const closeMobile = () => setOpenMobile(false);

    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-3">
          <Link to="/agency" onClick={closeMobile} className="flex h-9 items-center gap-2 overflow-hidden px-1 font-bold">
            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sm text-sidebar-primary-foreground">N</span>
            <span className="whitespace-nowrap text-lg group-data-[collapsible=icon]:hidden">Noti<span className="text-sidebar-primary">Proof</span></span>
          </Link>
          <div className="overflow-hidden px-2 py-1 group-data-[collapsible=icon]:hidden">
            <div className="text-xs text-sidebar-foreground/70">Agency</div>
            <div className="truncate text-sm font-medium">{agency.name}</div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Agency workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map(({ to, label, icon: Icon, end }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      tooltip={label}
                      isActive={end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)}
                    >
                      <NavLink to={to} end={end} onClick={closeMobile}>
                        <Icon />
                        <span>{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut}>
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  };

  return (
    <SidebarProvider defaultOpen>
      <AgencySidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-3 md:px-4">
          <SidebarTrigger className="h-9 w-9" />
          <UserAvatarMenu onSignOut={handleSignOut} />
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}