import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

function Stub({ title, description, sprint }: { title: string; description: string; sprint: string }) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Construction className="h-4 w-4" />
            Coming in {sprint}
          </CardTitle>
          <CardDescription>
            The agency foundation (database, RLS, edge functions) is live. This screen ships next.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export const AgencyTeam = () => <Stub title="Team" description="Invite team members and assign them to clients." sprint="Sprint 6" />;
