import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreviewRender } from "@/components/widgets/PreviewRender";

const db = supabase as any;

type V = "floating" | "banner" | "wall" | "badge" | "inline" | "carousel" | "marquee" | "masonry" | "avatar_row" | "video_hero" | "logo_strip";

const LAYOUTS: { v: V; name: string; desc: string }[] = [
  { v: "floating", name: "Floating popup", desc: "Small rotating card in a page corner." },
  { v: "banner", name: "Top banner", desc: "Slim bar across the top of the page." },
  { v: "wall", name: "Wall (badge + popup)", desc: "Badge that opens all your proof." },
  { v: "badge", name: "Badge", desc: "Star rating with review count." },
  { v: "inline", name: "Inline single", desc: "One testimonial placed inside your page." },
  { v: "carousel", name: "Carousel", desc: "Slides through several testimonials." },
  { v: "marquee", name: "Marquee", desc: "Continuously scrolling row of cards." },
  { v: "masonry", name: "Wall / Masonry", desc: "Grid of every testimonial." },
  { v: "avatar_row", name: "Avatar row", desc: "Customer faces with a rating." },
  { v: "video_hero", name: "Video hero", desc: "One big video testimonial." },
  { v: "logo_strip", name: "Logo strip", desc: "Customer company logos." },
];

const now = new Date().toISOString();
const SAMPLES: any[] = [
  { id: "s1", author_name: "Maya Chen", author_role: "Founder", author_company: "Bloom Co", content: "Our sign-ups jumped 32% the first week we showed real reviews.", rating: 5, type: "testimonial", created_at: now, verified: true },
  { id: "s2", author_name: "James Okafor", author_role: "Owner", author_company: "Okafor Studio", content: "Setup took five minutes and customers trust us more.", rating: 5, type: "testimonial", created_at: now, verified: true },
  { id: "s3", author_name: "Lena Brooks", author_company: "Northside Fitness", content: "Finally an easy way to show what members say about us.", rating: 4, type: "testimonial", created_at: now, verified: true },
];

export default function WidgetGallery() {
  const { currentBusinessId } = useAuth();
  const [proofs, setProofs] = useState<any[]>(SAMPLES);
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (!currentBusinessId) return;
    db.from("proof_objects").select("*").eq("business_id", currentBusinessId).eq("status", "approved")
      .order("created_at", { ascending: false }).limit(8)
      .then(({ data }: any) => {
        if (data?.length) { setProofs(data); setCount(data.length); }
      });
  }, [currentBusinessId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Layout gallery</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every layout, shown with {proofs === SAMPLES ? "sample proof" : "your approved proof"}. Pick one to start a widget with it.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {LAYOUTS.map((l) => (
          <Card key={l.v} className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{l.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{l.desc}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              <div className="relative flex-1 min-h-[180px] max-h-[260px] overflow-hidden rounded-md border bg-muted/40 p-3">
                <PreviewRender variant={l.v} cfg={{ variant: l.v, show_avatar: true, show_rating: true, review_count: count, card_count: 2, columns: 2, powered_by: false }} sample={proofs[0]} samples={proofs} showPoweredBy={false} />
              </div>
              <Button asChild size="sm" className="self-start"><Link to={`/widgets/new?variant=${l.v}`}>Use this layout</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
