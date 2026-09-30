import { Eye, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/**
 * Pinned read-only banner shown whenever a platform admin is "viewing as"
 * a business. While active, AuthContext forces currentBusinessRole to
 * 'viewer', so all editor/owner-gated UI is hidden or disabled automatically.
 */
export function ImpersonationBanner() {
  const { impersonation, stopImpersonation, profile } = useAuth();
  const navigate = useNavigate();

  if (!impersonation || !profile?.is_admin) return null;

  const stop = async () => {
    const businessId = impersonation.businessId;
    stopImpersonation();
    try {
      await db.rpc("log_admin_action", {
        _business_id: businessId,
        _action: "impersonation_stopped",
        _details: {},
      });
    } catch {
      // Non-blocking — banner has already cleared.
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-500/40 bg-amber-500/10 backdrop-blur supports-[backdrop-filter]:bg-amber-500/15">
      <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
        <Eye className="h-4 w-4 text-amber-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-amber-900">Viewing as:</span>{" "}
          <span className="text-amber-900 truncate">{impersonation.businessName}</span>
          <span className="ml-2 text-xs text-amber-800/80">Read-only — all writes are disabled.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await stop();
            navigate("/admin/businesses");
          }}
          className="border-amber-600/40 bg-white/70 hover:bg-white text-amber-900"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Stop viewing
        </Button>
      </div>
    </div>
  );
}
