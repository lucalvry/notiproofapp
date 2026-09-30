import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hammer } from "lucide-react";

export default function PlaceholderTab({
  title,
  description,
  sprint,
}: {
  title: string;
  description: string;
  sprint: "B" | "C";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Hammer className="h-4 w-4 text-muted-foreground" />
          {title}
          <Badge variant="outline" className="ml-2">
            Sprint {sprint}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}