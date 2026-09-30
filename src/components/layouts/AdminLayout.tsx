import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { ImpersonationBanner } from "./ImpersonationBanner";
import {
  LayoutDashboard,
  Building2,
  HeartPulse,
  ShieldAlert,
  LogOut,
  ArrowLeft,
} from "lucide-react";
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

const adminNav = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/businesses", label: "Businesses", icon: Building2 },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { to: "/admin/health", label: "Health", icon: HeartPulse },
];

export function AdminLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  useIdleLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const AdminSidebar = () => {
    const { setOpenMobile } = useSidebar();
    const closeMobile = () => setOpenMobile(false);

    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-3">
          <Link to="/admin/dashboard" onClick={closeMobile} className="flex h-9 items-center gap-2 overflow-hidden px-1 font-bold">
            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sm text-sidebar-primary-foreground">N</span>
            <span className="whitespace-nowrap text-lg group-data-[collapsible=icon]:hidden">Noti<span className="text-sidebar-primary">Proof</span></span>
          </Link>
          <div className="px-2 text-xs uppercase text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">Admin console</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild tooltip={label}>
                      <NavLink to={to} onClick={closeMobile} className={({ isActive }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}>
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
          <div className="truncate px-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">{profile?.email}</div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Back to app" onClick={() => navigate("/dashboard")}>
                <ArrowLeft />
                <span>Back to app</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
    <AdminRoute>
      <SidebarProvider defaultOpen>
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          <ImpersonationBanner />
          <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-card px-3 md:px-4">
            <SidebarTrigger className="h-9 w-9" />
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AdminRoute>
  );
}
