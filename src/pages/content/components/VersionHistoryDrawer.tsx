import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export interface HistoryEntry {
  content: string;
  edited_at?: string;
  edited_by?: string;
}

interface Props {
  pieceId: string;
  currentContent: string;
  history: HistoryEntry[];
  onReverted: () => void;
}

export function VersionHistoryDrawer({ pieceId, currentContent, history, onReverted }: Props) {
  const { toast } = useToast();
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const list = [...history].slice(-10).reverse();

  const revert = async (entry: HistoryEntry, idx: number) => {
    setBusyIdx(idx);
    const nextHistory = [
      ...history.slice(-9),
      { content: currentContent, edited_at: new Date().toISOString() },
    ];
    const { error } = await db
      .from("content_pieces")
      .update({
        content: entry.content,
        char_count: entry.content.length,
        edit_history: nextHistory,
      })
      .eq("id", pieceId);
    setBusyIdx(null);
    if (error) {
      toast({ title: "Revert failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reverted to selected version" });
    setOpen(false);
    onReverted();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-1.5" /> History ({list.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">No previous versions yet.</p>
          )}
          {list.map((entry, idx) => (
            <div key={idx} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {entry.edited_at ? new Date(entry.edited_at).toLocaleString() : `Version ${list.length - idx}`}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revert(entry, idx)}
                  disabled={busyIdx !== null}
                  className="h-7 text-xs"
                >
                  {busyIdx === idx ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  )}
                  Revert
                </Button>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-sans line-clamp-6 text-muted-foreground">
                {entry.content}
              </pre>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}