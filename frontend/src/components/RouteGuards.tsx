import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">
      <div className="text-center">{children}</div>
    </div>
  );
}

// Waits for the token check before deciding anything, so a refresh never flashes
// the login page or bounces the user off a deep link.
export function RequireAuth() {
  const { status, retry } = useAuth();

  if (status === "loading") return <FullPageMessage>Loading…</FullPageMessage>;
  if (status === "error") {
    return (
      <FullPageMessage>
        <p className="mb-3">Can't reach the server.</p>
        <button
          onClick={retry}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Retry
        </button>
      </FullPageMessage>
    );
  }
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Must be rendered inside RequireAuth, so the user is already loaded. Roles are declared
// on the route itself, so every URL the route matches (/users/, /USERS, /users/5) is guarded.
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();

  if (user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
