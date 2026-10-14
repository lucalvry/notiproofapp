import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Proof = {
  id: string;
  content: string | null;
  author_name: string | null;
  author_role: string | null;
  author_company: string | null;
  author_photo_url: string | null;
  author_avatar_url: string | null;
  rating: number | null;
  media_url: string | null;
  poster_url: string | null;
};

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-render`;

/** Public, shareable "Wall of Love" — every approved proof for a business. */
export default function Wall() {
  const { businessId } = useParams();
  const [proofs, setProofs] = useState<Proof[] | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!businessId) return;
    fetch(`${FN}?business=${encodeURIComponent(businessId)}&limit=50`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((d) => {
        setName(d?.business?.name ?? "");
        setProofs(d?.proofs ?? []);
      })
      .catch(() => setProofs([]));
  }, [businessId]);

  useEffect(() => {
    if (name) document.title = `${name} — Wall of Love`;
  }, [name]);

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-5xl mx-auto px-6 pt-14 pb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{name ? `What people say about ${name}` : "Wall of Love"}</h1>
        <p className="text-muted-foreground mt-2">Real reviews and testimonials from real customers.</p>
      </header>
      <main className="max-w-5xl mx-auto px-6 pb-16">
        {proofs === null ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : proofs.length === 0 ? (
          <p className="text-center text-muted-foreground">No testimonials to show yet.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {proofs.map((p) => (
              <article key={p.id} className="break-inside-avoid mb-4 rounded-xl border bg-card p-5 shadow-sm">
                {p.media_url && (
                  <video src={p.media_url} poster={p.poster_url ?? undefined} controls className="w-full rounded-lg mb-3" />
                )}
                {p.rating ? (
                  <div className="flex gap-0.5 mb-2" aria-label={`${p.rating} out of 5`}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < (p.rating ?? 0) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                ) : null}
                {p.content && <p className="text-sm leading-relaxed text-card-foreground">{p.content}</p>}
                <div className="flex items-center gap-3 mt-4">
                  {(p.author_photo_url || p.author_avatar_url) && (
                    <img src={(p.author_photo_url || p.author_avatar_url)!} alt="" className="h-9 w-9 rounded-full object-cover" />
                  )}
                  <div className="text-sm">
                    <div className="font-medium">{p.author_name ?? "Verified customer"}</div>
                    {(p.author_role || p.author_company) && (
                      <div className="text-xs text-muted-foreground">{[p.author_role, p.author_company].filter(Boolean).join(", ")}</div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground mt-10">
          Powered by <a href="https://notiproof.xyz" className="underline">NotiProof</a>
        </p>
      </main>
    </div>
  );
}
