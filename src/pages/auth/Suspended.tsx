import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Suspended() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mt-1">Account suspended</h1>
          <p className="text-muted-foreground mt-2">
            This account has been suspended. Please contact support to reactivate it.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <a href="mailto:support@notiproof.com">Contact support</a>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            <Link to="/login" className="underline">Sign in with a different account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
