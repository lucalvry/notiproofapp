import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, businesses, currentBusinessId, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If every business this user belongs to is suspended, lock them out.
  if (businesses.length > 0 && businesses.every((b) => !!b.suspended_at)) {
    return <Navigate to="/suspended" replace />;
  }

  const currentBusiness = businesses.find((b) => b.id === currentBusinessId);

  // Suspended current business: route to suspended page.
  if (currentBusiness?.suspended_at) {
    return <Navigate to="/suspended" replace />;
  }

  return <>{children}</>;
}
