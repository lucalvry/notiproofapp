import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, CreditCard, Users, LogOut, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "./PlanBadge";

export function UserAvatarMenu({ onSignOut }: { onSignOut: () => void }) {
  const { profile, businesses, currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const current = businesses.find((b) => b.id === currentBusinessId);
  const initial = (profile?.full_name || profile?.email || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full h-9 w-9 p-0"
          aria-label="Open user menu"
        >
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-3 space-y-1">
          <div className="text-sm font-semibold leading-tight truncate">
            {profile?.full_name || "User"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {profile?.email}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            {current && (
              <PlanBadge plan={(current as { plan?: string | null; plan_tier?: string | null }).plan ?? current.plan_tier} />
            )}
            {profile?.is_admin && (
              <Badge variant="default" className="h-5 gap-1 bg-amber-500 hover:bg-amber-500 text-white">
                <Shield className="h-3 w-3" /> Super Admin
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {profile?.is_admin && (
          <>
            <DropdownMenuItem
              onClick={() => navigate("/admin")}
              className="font-medium text-amber-600 focus:text-amber-700"
            >
              <Shield className="h-4 w-4 mr-2" /> Open Admin Console
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
          <Settings className="h-4 w-4 mr-2" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings/billing")}>
          <CreditCard className="h-4 w-4 mr-2" /> Billing
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings/team")}>
          <Users className="h-4 w-4 mr-2" /> Team
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}