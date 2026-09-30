import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Loader2, Eye, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";

type Template = { subject: string; body: string };

const DEFAULTS: Record<"initial" | "reminder", Template> = {
  initial: {
    subject: "We'd love to hear about your experience, {{customer_name}}",
    body:
      "Hi {{customer_name}},\n\nThanks for choosing {{business_name}}! Could you take 60 seconds to share a quick testimonial about {{product_name}}?\n\n{{link}}\n\nThank you,\nThe {{business_name}} team",
  },
  reminder: {
    subject: "Quick reminder — your testimonial for {{business_name}}",
    body:
      "Hi {{customer_name}},\n\nJust a friendly nudge — we'd still love to hear about your experience with {{business_name}}. It only takes a minute:\n\n{{link}}\n\nThank you,\nThe {{business_name}} team",
  },
};

const PREVIEW_VARS = {
  customer_name: "Jane",
  business_name: "Acme Studio",
  product_name: "Pro plan",
  link: "https://app.notiproof.com/collect/sample-token",
};

function renderTemplate(t: string, vars: Record<string, string>) {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export default function EmailSettings() {
  const { toast } = useToast();
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const [initial, setInitial] = useState<Template>(DEFAULTS.initial);
  const [reminder, setReminder] = useState<Template>(DEFAULTS.reminder);
  const [businessName, setBusinessName] = useState("Your business");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string>("#FF6B4A");
  const [active, setActive] = useState<"initial" | "reminder">("initial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";

  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [focusedField, setFocusedField] = useState<"subject" | "body">("body");

  const VARIABLES = ["customer_name", "business_name", "product_name", "link"];

  const insertVariable = (name: string) => {
    if (!canEdit) return;
    const token = `{{${name}}}`;
    if (focusedField === "subject") {
      const el = subjectRef.current;
      const value = current.subject;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + token + value.slice(end);
      setCurrent({ ...current, subject: next });
      requestAnimationFrame(() => {
        if (!el) return;
        const pos = start + token.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    } else {
      const el = bodyRef.current;
      const value = current.body;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + token + value.slice(end);
      setCurrent({ ...current, body: next });
      requestAnimationFrame(() => {
        if (!el) return;
        const pos = start + token.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    }
  };

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    (supabase as any)
      .from("businesses")
      .select("settings, name, logo_url, brand_color")
      .eq("id", currentBusinessId)
      .maybeSingle()
      .then(({ data }) => {
        const settings = (data?.settings as Record<string, unknown> | null) ?? {};
        const tplBlock = (settings.email_templates ?? {}) as {
          initial?: Template;
          reminder?: Template;
        };
        // Back-compat: an older single-template stored at settings.email_template
        const legacy = (settings.email_template ?? null) as Template | null;
        setInitial({ ...DEFAULTS.initial, ...(tplBlock.initial ?? legacy ?? {}) });
        setReminder({ ...DEFAULTS.reminder, ...(tplBlock.reminder ?? {}) });
        setBusinessName(data?.name ?? "Your business");
        setLogoUrl(data?.logo_url ?? null);
        setBrandColor(data?.brand_color ?? "#FF6B4A");
        setLoading(false);
      });
  }, [currentBusinessId]);

  const save = async () => {
    if (!currentBusinessId) return;
    setSaving(true);
    const { data: row } = await (supabase as any)
      .from("businesses")
      .select("settings")
      .eq("id", currentBusinessId)
      .maybeSingle();
    const settings = (row?.settings as Record<string, unknown> | null) ?? {};
    const next = {
      ...settings,
      email_templates: { initial, reminder },
      // Keep legacy key in sync for older code paths
      email_template: initial,
    };
    const { error } = await (supabase as any).from("businesses").update({ settings: next }).eq("id", currentBusinessId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Templates saved",
        description: "New testimonial requests will use these templates.",
      });
    }
  };

  const current = active === "initial" ? initial : reminder;
  const setCurrent = active === "initial" ? setInitial : setReminder;
  const previewVars = { ...PREVIEW_VARS, business_name: businessName };

  const previewSubject = useMemo(() => renderTemplate(current.subject, previewVars), [current.subject, previewVars]);
  const previewBodyHtml = useMemo(() => {
    const rendered = renderTemplate(current.body, previewVars);
    const html = rendered
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" style="color:${brandColor}">$1</a>`)
      .replace(/\n/g, "<br>");
    // Defence-in-depth: scrub the rendered HTML through DOMPurify.
    return sanitizeHtml(html);
  }, [current.body, previewVars, brandColor]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px] max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Testimonial request emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={active} onValueChange={(v) => setActive(v as "initial" | "reminder")}>
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="initial">Initial request</TabsTrigger>
              <TabsTrigger value="reminder">Reminder</TabsTrigger>
            </TabsList>

            <TabsContent value="initial" className="pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Sent immediately when you create a new request.
              </p>
            </TabsContent>
            <TabsContent value="reminder" className="pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Sent if the customer hasn't responded after a few days.
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              ref={subjectRef}
              value={current.subject}
              onChange={(e) => setCurrent({ ...current, subject: e.target.value })}
              onFocus={() => setFocusedField("subject")}
              disabled={loading || !canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              ref={bodyRef}
              rows={12}
              value={current.body}
              onChange={(e) => setCurrent({ ...current, body: e.target.value })}
              onFocus={() => setFocusedField("body")}
              disabled={loading || !canEdit}
              className="font-mono text-sm"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Insert variable:</span>
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  disabled={loading || !canEdit}
                  className="text-xs font-mono rounded-full border px-2 py-0.5 bg-muted hover:bg-accent hover:text-accent-foreground transition disabled:opacity-50"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!currentBusinessId) return;
                setSendingTest(true);
                const { data, error } = await supabase.functions.invoke("send-test-email", {
                  body: { business_id: currentBusinessId, template: active },
                });
                setSendingTest(false);
                if (error || (data as { error?: string })?.error) {
                  toast({
                    title: "Test email failed",
                    description: error?.message || (data as { error?: string })?.error || "Unknown error",
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: "Test email sent",
                    description: `Check your inbox at ${(data as { sent_to?: string })?.sent_to ?? "your account email"}.`,
                  });
                }
              }}
              disabled={sendingTest || loading || !canEdit}
            >
              {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send test to me
            </Button>
            <Button onClick={save} disabled={saving || loading || !canEdit}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save templates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card className="self-start sticky top-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" /> Live preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b text-xs text-muted-foreground">
              <div className="font-medium text-foreground truncate">{previewSubject}</div>
              <div>To: jane@example.com</div>
            </div>
            <div className="bg-background p-5">
              <div
                className="h-1 rounded-full mb-4"
                style={{ background: brandColor }}
              />
              <div className="flex items-center gap-2 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} className="h-7 w-7 rounded object-cover" />
                ) : (
                  <div
                    className="h-7 w-7 rounded text-white text-xs font-semibold flex items-center justify-center"
                    style={{ background: brandColor }}
                  >
                    {businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold">{businessName}</span>
              </div>
              <div
                className="text-sm leading-relaxed"
                style={{ color: "#1a1a1a", fontFamily: "system-ui, sans-serif" }}
                dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Preview uses sample data. Real emails inject the recipient's name and a unique collection link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
