import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { YouTubeEmbed } from "@/components/video/YouTubeEmbed";
import { EXPLAINER_LIST, EXPLAINER_VIDEOS, ExplainerAudience } from "@/lib/explainer-videos";

const AUDIENCE_CTA: Record<ExplainerAudience, { label: string; to: string } | null> = {
  business: { label: "Start a free trial", to: "/signup" },
  marketer: { label: "Try it free", to: "/signup" },
  agency: { label: "Start your agency", to: "/agency/signup" },
  customer: null,
};

export default function WatchIndex() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Noti<span className="text-accent">Proof</span>
          </Link>
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold">See NotiProof in action</h1>
          <p className="text-muted-foreground mt-2">Pick the tour that fits — each one is under 90 seconds.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {EXPLAINER_LIST.map((v) => (
            <Card key={v.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <YouTubeEmbed audience={v.id} mode="modal" rounded="md" caption="" />
              <CardContent className="p-5 space-y-2">
                <h2 className="font-semibold text-lg">{v.title}</h2>
                <p className="text-sm text-muted-foreground">{v.tagline}</p>
                <div className="flex items-center justify-between pt-1">
                  <Link to={v.watchPath} className="text-sm text-accent hover:underline">
                    Open full page →
                  </Link>
                  {AUDIENCE_CTA[v.id] && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={AUDIENCE_CTA[v.id]!.to}>{AUDIENCE_CTA[v.id]!.label}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

export function WatchAudience() {
  const { audience } = useParams<{ audience: ExplainerAudience }>();
  const video = audience && EXPLAINER_VIDEOS[audience];
  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Video not found.</p>
          <Button asChild className="mt-4"><Link to="/watch">See all demos</Link></Button>
        </div>
      </div>
    );
  }
  const cta = AUDIENCE_CTA[video.id];
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Noti<span className="text-accent">Proof</span>
          </Link>
          <Link to="/watch" className="text-sm text-muted-foreground hover:text-foreground">All demos</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{video.title}</h1>
          <p className="text-muted-foreground mt-2">{video.tagline}</p>
        </div>
        <YouTubeEmbed audience={video.id} mode="inline" rounded="xl" caption="" />
        {cta && (
          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link to={cta.to}>{cta.label} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
