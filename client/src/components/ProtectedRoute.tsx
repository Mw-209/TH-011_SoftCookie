import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "../auth/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  /** When set, only these roles may view the route (BR-05, mirrored server-side). */
  allowedRoles?: Role[];
}

/**
 * Client-side gate only. The server re-checks every request, so this exists to
 * avoid flashing protected screens, never as the security boundary itself.
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-cookie-cream text-cookie-cocoa"
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
