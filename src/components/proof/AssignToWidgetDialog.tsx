import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proofIds: string[];
  onAssigned?: () => void;
}

type W = { id: string; name: string; config: any };

/** Adds the chosen proofs to one or more widgets and switches them to "only selected proofs". */
export function AssignToWidgetDialog({ open, onOpenChange, proofIds, onAssigned }: Props) {
  const { currentBusinessId } = useAuth();
  const [widgets, setWidgets] = useState<W[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !currentBusinessId) return;
    setPicked(new Set());
    supabase.from("widgets").select("id, name, config").eq("business_id", currentBusinessId).order("created_at")
      .then(({ data }) => setWidgets((data as W[]) ?? []));
  }, [open, currentBusinessId]);

  const save = async () => {
    setSaving(true);
    try {
      for (const w of widgets.filter((x) => picked.has(x.id))) {
        const cfg = w.config ?? {};
        const ids = Array.from(new Set([...(cfg.selected_proof_ids ?? []), ...proofIds]));
        const { error } = await supabase.from("widgets")
          .update({ config: { ...cfg, source_filter: "selected", selected_proof_ids: ids } })
          .eq("id", w.id);
        if (error) throw error;
      }
      toast.success(`Added ${proofIds.length} proof${proofIds.length === 1 ? "" : "s"} to ${picked.size} widget${picked.size === 1 ? "" : "s"}`);
      onAssigned?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to widget</DialogTitle>
          <DialogDescription>
            The chosen widgets will show only their selected proofs, including these {proofIds.length}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-72 overflow-auto">
          {widgets.length === 0 && <p className="text-sm text-muted-foreground">No widgets yet. Create one first.</p>}
          {widgets.map((w) => (
            <label key={w.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer">
              <Checkbox
                checked={picked.has(w.id)}
                onCheckedChange={(c) => {
                  const n = new Set(picked);
                  c ? n.add(w.id) : n.delete(w.id);
                  setPicked(n);
                }}
              />
              <span className="text-sm font-medium">{w.name}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || picked.size === 0 || proofIds.length === 0}>
            {saving ? "Saving…" : "Add to widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
