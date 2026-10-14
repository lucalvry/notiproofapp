import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/** Short explanation of each workspace, matched by path prefix. */
export const PAGE_HELP: { prefix: string; title: string; body: string }[] = [
  { prefix: "/dashboard", title: "Dashboard", body: "Your setup progress and a quick view of proof, widgets and results. Use the date filter to change the period." },
  { prefix: "/proof", title: "Proof library", body: "Every review, testimonial and purchase we've collected for you. Approve the ones you want shown on your website, or request new testimonials from customers." },
  { prefix: "/content", title: "Content", body: "Turn approved proof into ready-to-post social posts, emails and ad copy with AI, then review and publish them." },
  { prefix: "/campaigns", title: "Campaigns", body: "Ask customers for testimonials automatically, for example a few days after they buy." },
  { prefix: "/case-studies", title: "Case studies", body: "Combine several proofs into a full customer success story you can publish on your site." },
  { prefix: "/widgets", title: "Widgets", body: "Design how proof appears on your website — pop-ups, walls, carousels and more — then copy the install snippet." },
  { prefix: "/integrations", title: "Integrations", body: "Connect where your proof comes from: Google reviews, Stripe, Shopify, WooCommerce and more. New reviews and sales are imported automatically." },
  { prefix: "/analytics", title: "Analytics", body: "See how often your proof was viewed and clicked, and which proofs help visitors convert." },
  { prefix: "/settings/billing", title: "Billing", body: "Your plan, usage and invoices. Upgrade to raise limits and keep data longer." },
  { prefix: "/settings/team", title: "Team", body: "Invite teammates and choose what each person can do." },
  { prefix: "/settings/brand-voice", title: "Brand voice", body: "Tell our AI how your brand sounds so generated content matches your style." },
  { prefix: "/settings/referrals", title: "Referrals", body: "Share your link and earn 20% of every payment from people you refer." },
  { prefix: "/settings", title: "Settings", body: "Your business details, email templates, account and preferences." },
];

export function helpFor(pathname: string) {
  return PAGE_HELP.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
}

/** "What is this?" button for the current page; opens automatically on the first visit. */
export function PageIntro() {
  const { pathname } = useLocation();
  const help = helpFor(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!help) return;
    const key = `notiproof.intro_seen.${help.prefix}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
      localStorage.setItem(key, "1");
    } else setOpen(false);
  }, [help?.prefix]);

  if (!help) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">What is {help.title}?</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{help.title}</h3>
          <button aria-label="Close" onClick={() => setOpen(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{help.body}</p>
      </PopoverContent>
    </Popover>
  );
}
