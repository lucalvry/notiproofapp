import { Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isViewer } from "@/lib/roles";

export function ReadOnlyBanner() {
  const { currentBusinessRole } = useAuth();
  if (!isViewer(currentBusinessRole)) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <Eye className="h-4 w-4 shrink-0" />
      <span>You have view-only access to this business. Ask an owner to upgrade your role to make changes.</span>
    </div>
  );
}
