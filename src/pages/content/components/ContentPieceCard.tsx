import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Copy, MoreHorizontal, Check, Archive, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export const OUTPUT_TYPE_LABELS: Record<string, string> = {
  twitter_post: "Twitter / X",
  linkedin_post: "LinkedIn",
  email_block: "Email",
  ad_copy_headline: "Ad headline",
  ad_copy_body: "Ad body",
  website_quote: "Website quote",
  short_caption: "Short caption",
  meta_description: "Meta description",
  case_study_section: "Case study",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  approved: "default",
  published: "outline",
  archived: "outline",
};

export interface ContentPieceCardData {
  id: string;
  output_type: string;
  status: string;
  content: string;
  char_count: number | null;
  proof_object_id: string;
  proof_author?: string | null;
}

export function ContentPieceCard({
  piece,
  onChange,
}: {
  piece: ContentPieceCardData;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const setStatus = async (status: string) => {
    setBusy(true);
    const { error } = await db.from("content_pieces").update({ status }).eq("id", piece.id);
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: status === "approved" ? "Approved" : status === "archived" ? "Archived" : status });
    onChange();
  };

  const copy = () => {
    navigator.clipboard.writeText(piece.content);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="pt-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px]">
            {OUTPUT_TYPE_LABELS[piece.output_type] ?? piece.output_type}
          </Badge>
          <Badge variant={STATUS_VARIANTS[piece.status] ?? "secondary"} className="capitalize text-[10px]">
            {piece.status}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed line-clamp-3 flex-1 whitespace-pre-wrap">
          {piece.content}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{piece.char_count ?? piece.content.length} chars</span>
          {piece.proof_author && <span className="truncate ml-2">From {piece.proof_author}</span>}
        </div>
        <div className="flex items-center gap-1 pt-1 border-t">
          <Button size="sm" variant="ghost" onClick={copy} className="flex-1">
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
          </Button>
          {piece.status !== "approved" && (
            <Button size="sm" variant="ghost" onClick={() => setStatus("approved")} disabled={busy}>
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/content/${piece.id}/edit`)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copy}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {piece.status !== "archived" && (
                <DropdownMenuItem onClick={() => setStatus("archived")}>
                  <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                </DropdownMenuItem>
              )}
              {piece.status === "archived" && (
                <DropdownMenuItem onClick={() => setStatus("draft")}>
                  Restore to draft
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
