import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, History, Save, Trash2, Printer, Download, Copy } from "lucide-react";
import { SeoFields } from "./components/SeoFields";
import "@/styles/print.css";

const db = supabase as any;

interface CaseStudy {
  id: string;
  business_id: string;
  title: string;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  content: string | null;
  status: string;
  customer_handle: string | null;
  edit_history: any[];
}

interface SourceProof { id: string; author_name: string | null; content: string | null; is_primary: boolean; }

function slugify(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export default function CaseStudyEditor() {
  const { id } = useParams<{ id: string }>();
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [cs, setCs] = useState<CaseStudy | null>(null);
  const [proofs, setProofs] = useState<SourceProof[]>([]);
  const [busy, setBusy] = useState(false);
  const [original, setOriginal] = useState("");

  const load = async () => {
    if (!id) return;
    const { data } = await db.from("case_studies").select("*").eq("id", id).maybeSingle();
    setCs(data);
    setOriginal(data?.content || "");
    const { data: links } = await db
      .from("case_study_proof_links")
      .select("is_primary, proof_objects:proof_object_id (id, author_name, content)")
      .eq("case_study_id", id)
      .order("position", { ascending: true });
    setProofs(((links as any[]) ?? []).map((l) => ({
      id: l.proof_objects?.id, author_name: l.proof_objects?.author_name,
      content: l.proof_objects?.content, is_primary: l.is_primary,
    })).filter((p) => p.id));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const update = (patch: Partial<CaseStudy>) => setCs((c) => (c ? { ...c, ...patch } : c));

  const save = async () => {
    if (!cs || !id) return;
    setBusy(true);
    const history = Array.isArray(cs.edit_history) ? cs.edit_history : [];
    const newHistory = [
      { content: original, edited_at: new Date().toISOString() },
      ...history,
    ].slice(0, 10);
    const { error } = await db.from("case_studies").update({
      title: cs.title,
      slug: cs.slug || slugify(cs.title),
      meta_title: cs.meta_title,
      meta_description: cs.meta_description,
      content: cs.content,
      status: cs.status,
      edit_history: newHistory,
    }).eq("id", id);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    setOriginal(cs.content || "");
    setCs((c) => (c ? { ...c, edit_history: newHistory } : c));
  };

  const revert = async (snapshot: string) => {
    if (!cs) return;
    const newHistory = [
      { content: cs.content || "", edited_at: new Date().toISOString() },
      ...(cs.edit_history || []),
    ].slice(0, 10);
    update({ content: snapshot, edit_history: newHistory });
    toast({ title: "Reverted (remember to Save)" });
  };

  const remove = async () => {
    if (!id) return;
    const { error } = await db.from("case_studies").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    navigate("/case-studies");
  };

  const exportMarkdown = () => {
    if (!cs) return;
    const blob = new Blob([cs.content || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cs.slug || "case-study"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyHtml = async () => {
    if (!cs) return;
    const div = document.getElementById("case-study-print");
    if (!div) return;
    await navigator.clipboard.writeText(div.innerHTML);
    toast({ title: "HTML copied" });
  };

  if (!cs) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/case-studies"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={cs.status} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm"><History className="h-4 w-4 mr-1" /> History</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>Version history</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-2 max-h-[80vh] overflow-y-auto">
                {(cs.edit_history || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No history yet.</p>
                )}
                {(cs.edit_history || []).map((h: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="pt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">{new Date(h.edited_at).toLocaleString()}</p>
                      <p className="text-xs line-clamp-3 whitespace-pre-wrap">{(h.content || "").slice(0, 200)}…</p>
                      <Button size="sm" variant="outline" onClick={() => revert(h.content || "")}>Revert</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="sm" onClick={exportMarkdown}><Download className="h-4 w-4 mr-1" /> .md</Button>
          <Button variant="outline" size="sm" onClick={copyHtml}><Copy className="h-4 w-4 mr-1" /> HTML</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> PDF</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete case study?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={save} disabled={busy}><Save className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4 no-print">
          <Card>
            <CardContent className="pt-6">
              <SeoFields
                title={cs.title || ""}
                slug={cs.slug || ""}
                metaTitle={cs.meta_title || ""}
                metaDescription={cs.meta_description || ""}
                onChange={(p) => update({
                  title: p.title ?? cs.title,
                  slug: p.slug ?? cs.slug,
                  meta_title: p.metaTitle ?? cs.meta_title,
                  meta_description: p.metaDescription ?? cs.meta_description,
                })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="edit">
                <TabsList>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="mt-3">
                  <Textarea
                    value={cs.content || ""}
                    onChange={(e) => update({ content: e.target.value })}
                    className="min-h-[60vh] font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-3">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{cs.content || ""}</ReactMarkdown>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3 no-print">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Source proofs</h3>
          {proofs.length === 0 && <p className="text-xs text-muted-foreground">None linked.</p>}
          {proofs.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.author_name || "Anonymous"}</span>
                  {p.is_primary && <span className="text-[10px] text-primary font-semibold">PRIMARY</span>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{p.content}</p>
              </CardContent>
            </Card>
          ))}
        </aside>
      </div>

      {/* Hidden printable view */}
      <div id="case-study-print" className="hidden print:block">
        <h1>{cs.title}</h1>
        <ReactMarkdown>{cs.content || ""}</ReactMarkdown>
      </div>
    </div>
  );
}
