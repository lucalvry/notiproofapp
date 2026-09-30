import { Card, CardContent } from "@/components/ui/card";

export default function Placeholder({ title, code }: { title?: string; code?: string }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {code && <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{code}</div>}
      <h1 className="text-3xl font-bold">{title ?? "Coming soon"}</h1>
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          This screen is being rebuilt to match the v2 spec.
        </CardContent>
      </Card>
    </div>
  );
}
