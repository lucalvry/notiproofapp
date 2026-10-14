import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/** General collection link: /collect/b/:businessId → a fresh private form. */
export default function OpenCollect() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    (supabase as any).rpc("create_open_collection_request", { _business_id: businessId }).then(({ data, error }: any) => {
      if (error || !data) setError("This link isn't available right now. Please try again later.");
      else navigate(`/collect/${data}`, { replace: true });
    });
  }, [businessId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
      {error ? <p className="text-muted-foreground">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
    </div>
  );
}
