import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";

/** Renders the persistent "Managing: <client>" banner inside AppLayout when an
 *  agency user has an active client selected. Lets them exit back to the agency hub. */
export function ActiveClientBanner() {
  const { agency, activeClientId, setActiveClientId } = useAgency();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!agency || !activeClientId) {
      setName(null);
      return;
    }
    supabase
      .from("businesses")
      .select("name")
      .eq("id", activeClientId)
      .maybeSingle()
      .then(({ data }) => setName(data?.name ?? null));
  }, [agency?.id, activeClientId]);

  if (!agency || !activeClientId || !name) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 md:px-6 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        {agency.logo_url ? (
          <img src={agency.logo_url} alt="" className="h-5 w-5 rounded object-contain bg-white" />
        ) : null}
        <span className="text-muted-foreground">Managing:</span>
        <span className="font-medium truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" variant="ghost" className="h-7">
          <Link to={`/agency/clients/${activeClientId}`}>Workspace</Link>
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setActiveClientId(null)}>
          <X className="h-3.5 w-3.5 mr-1" />Exit
        </Button>
      </div>
    </div>
  );
}
