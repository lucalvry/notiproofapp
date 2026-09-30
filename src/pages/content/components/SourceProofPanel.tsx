import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export interface SourceProof {
  id: string;
  author_name?: string | null;
  author_role?: string | null;
  author_company?: string | null;
  author_avatar_url?: string | null;
  rating?: number | null;
  content?: string | null;
  raw_content?: string | null;
  outcome_claim?: string | null;
  source_type?: string | null;
  media_urls?: string[] | null;
}

export function SourceProofPanel({ proof }: { proof: SourceProof | null }) {
  if (!proof) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Loading source proof…
        </CardContent>
      </Card>
    );
  }

  const message = proof.content || proof.raw_content || "";
  const initials = (proof.author_name || "?").slice(0, 2).toUpperCase();
  const firstMedia = proof.media_urls?.[0];
  const isVideo = firstMedia && /\.(mp4|webm|mov)$/i.test(firstMedia);

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Source proof
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={proof.author_avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight">{proof.author_name || "Anonymous"}</p>
            {(proof.author_role || proof.author_company) && (
              <p className="text-xs text-muted-foreground truncate">
                {[proof.author_role, proof.author_company].filter(Boolean).join(" · ")}
              </p>
            )}
            {proof.rating != null && (
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < (proof.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          {proof.source_type && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {proof.source_type}
            </Badge>
          )}
        </div>

        {message && (
          <blockquote className="text-sm leading-relaxed border-l-2 border-primary/40 pl-3 whitespace-pre-wrap">
            {message}
          </blockquote>
        )}

        {proof.outcome_claim && (
          <div className="text-xs">
            <span className="text-muted-foreground">Outcome: </span>
            <span className="font-medium">{proof.outcome_claim}</span>
          </div>
        )}

        {firstMedia && (
          <div className="rounded-md overflow-hidden border bg-muted/30">
            {isVideo ? (
              <video src={firstMedia} controls className="w-full max-h-48 object-cover" />
            ) : (
              <img src={firstMedia} alt="Proof media" className="w-full max-h-48 object-cover" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}