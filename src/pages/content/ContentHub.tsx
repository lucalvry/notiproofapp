import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ListChecks } from "lucide-react";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";
import { ContentLibraryTab } from "./components/ContentLibraryTab";
import { ProofQueueTab } from "./components/ProofQueueTab";
import { ContentSubNav } from "./components/ContentSubNav";
import { VideoBadgeLink } from "@/components/video/YouTubeEmbed";

export default function ContentHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "queue" ? "queue" : "library";

  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "library") next.delete("tab");
    else next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ReadOnlyBanner />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">CONT-01</div>
          <h1 className="text-3xl font-bold mt-1">Content hub</h1>
          <p className="text-muted-foreground mt-1">
            AI-generated marketing pieces from your approved proof — and proofs still waiting for content.
          </p>
          <div className="mt-2"><VideoBadgeLink audience="marketer" label="See how marketers turn one proof into a week of content (1:20)" /></div>
        </div>
        <Button asChild variant="outline">
          <Link to="/content/review">
            <ListChecks className="h-4 w-4 mr-1.5" /> Bulk review drafts
          </Link>
        </Button>
      </div>
      <ContentSubNav />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="queue">Proof queue</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="mt-6">
          <ContentLibraryTab />
        </TabsContent>
        <TabsContent value="queue" className="mt-6">
          <ProofQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
