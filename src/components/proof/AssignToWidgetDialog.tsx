// Legacy component — kept as a no-op stub to satisfy imports.
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proofIds: string[];
  onAssigned?: () => void;
}

export function AssignToWidgetDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent />
    </Dialog>
  );
}
