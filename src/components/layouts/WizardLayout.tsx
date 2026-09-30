import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Link } from "react-router-dom";

export function WizardLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <header className="p-6">
          <Link to="/dashboard" className="text-xl font-bold tracking-tight text-primary">
            Noti<span className="text-accent">Proof</span>
          </Link>
        </header>
        <main className="container mx-auto px-4 pb-16">
          <div className="max-w-3xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
