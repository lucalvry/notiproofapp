import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SourceProofPanel, type SourceProof } from "./SourceProofPanel";

const db = supabase as any;

export function SourceProofSidebar({ proofId }: { proofId: string | null | undefined }) {
  const [proof, setProof] = useState<SourceProof | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!proofId) {
      setProof(null);
      return;
    }
    db.from("proof_objects").select("*").eq("id", proofId).maybeSingle().then(({ data }: any) => {
      setProof(data ?? null);
    });
  }, [proofId]);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center pt-2">
        <Button size="sm" variant="ghost" onClick={() => setCollapsed(false)} title="Show source proof">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setCollapsed(true)} className="h-7 text-xs">
          <ChevronRight className="h-3.5 w-3.5 mr-1" /> Hide
        </Button>
      </div>
      <SourceProofPanel proof={proof} />
    </div>
  );
}