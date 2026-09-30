import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { VideoBadgeLink } from "@/components/video/YouTubeEmbed";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Optional content rendered below the form card (legal links, microcopy, etc.) */
  footerSlot?: ReactNode;
}

export function AuthLayout({ children, title, subtitle, footerSlot }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Left rail — branding & social proof. Hidden on mobile. */}
      <aside className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground p-12 overflow-hidden">
        {/* Decorative blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute bottom-0 -right-24 h-96 w-96 rounded-full bg-primary-foreground/20 blur-3xl" />
        </div>

        <div className="relative">
          <a href="https://notiproof.xyz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
            Noti<span className="text-accent-foreground/90">Proof</span>
          </a>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-tight">
              Turn happy customers into your highest-converting marketing.
            </h2>
            <p className="text-primary-foreground/80 text-base">
              Collect testimonials, verify proof, and display social signals that build trust and drive conversions.
            </p>
            <div><VideoBadgeLink audience="business" label="Watch the 75-second tour" className="text-primary-foreground hover:text-primary-foreground/80" /></div>
          </div>

          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">AI-verified testimonials</p>
                <p className="text-sm text-primary-foreground/75">Authenticity scoring on every submission.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur">
                <Zap className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Live conversion widgets</p>
                <p className="text-sm text-primary-foreground/75">Drop-in proof that lifts checkout rates.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">GDPR & SOC-ready</p>
                <p className="text-sm text-primary-foreground/75">Enterprise-grade privacy by default.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="relative">
          <blockquote className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 backdrop-blur">
            <p className="text-sm text-primary-foreground/90 leading-relaxed">
              "NotiProof paid for itself in the first week — our checkout conversion jumped 18% after we turned on the live proof widget."
            </p>
            <footer className="mt-3 text-xs text-primary-foreground/70">
              Sarah K. · Founder, BrightCart
            </footer>
          </blockquote>
        </div>
      </aside>

      {/* Right column — form */}
      <main className="flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile header */}
        <header className="lg:hidden p-6">
          <a href="https://notiproof.xyz" target="_blank" rel="noopener noreferrer" className="text-xl font-bold tracking-tight text-primary hover:opacity-80 transition-opacity">
            Noti<span className="text-accent">Proof</span>
          </a>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 lg:py-12">
          <div className="w-full max-w-md">
            <div className="bg-card border rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in">
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {children}
            </div>
            {footerSlot && (
              <div className="mt-6 text-center text-xs text-muted-foreground">
                {footerSlot}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
