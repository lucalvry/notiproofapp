import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewTab from "./tabs/OverviewTab";
import SystemTab from "./tabs/SystemTab";
import PlaceholderTab from "./tabs/PlaceholderTab";
import RevenueTab from "./tabs/RevenueTab";
import UsersTab from "./tabs/UsersTab";
import IntegrationsTab from "./tabs/IntegrationsTab";
import AgenciesTab from "./tabs/AgenciesTab";
import AIPipelinesTab from "./tabs/AIPipelinesTab";
import EnrichmentTab from "./tabs/EnrichmentTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Revenue" },
  { id: "users", label: "Users" },
  { id: "agencies", label: "Agencies" },
  { id: "ai", label: "AI Pipelines" },
  { id: "integrations", label: "Integrations" },
  { id: "enrichment", label: "Enrichment" },
  { id: "system", label: "System" },
] as const;

export default function AdminOverview() {
  const [params, setParams] = useSearchParams();
  const activeTab = (params.get("tab") ?? "overview") as (typeof TABS)[number]["id"];
  const setTab = (t: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ADM-01</div>
        <h1 className="text-3xl font-bold mt-1">Admin dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform health, revenue, AI pipelines, integrations and system status — in one place.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs lg:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab onTabChange={setTab} />
        </TabsContent>
        <TabsContent value="revenue" className="mt-6">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
        <TabsContent value="agencies" className="mt-6">
          <AgenciesTab />
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <AIPipelinesTab />
        </TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="enrichment" className="mt-6">
          <EnrichmentTab />
        </TabsContent>
        <TabsContent value="system" className="mt-6">
          <SystemTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
