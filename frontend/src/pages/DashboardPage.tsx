import type { ComponentType } from "react";
import type { Role } from "../api/client";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import EngineerDashboard from "../components/dashboard/EngineerDashboard";
import ManagerDashboard from "../components/dashboard/ManagerDashboard";
import OperationsDashboard from "../components/dashboard/OperationsDashboard";
import { useAuth } from "../hooks/useAuth";

// Each role has its own layout: what it must decide or watch first (Needs attention), where
// everything stands (Overview) and the few items to act on (Top items). The API already scopes
// /dashboard and the lists per role; which sections show follows what it sends. A layout draws
// its own header, because the "Updated" time comes from the query that drives its cards.
const LAYOUT: Record<Role, ComponentType> = {
  manager: ManagerDashboard,
  engineer: EngineerDashboard,
  operations: OperationsDashboard,
  admin: AdminDashboard,
};

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  const Layout = LAYOUT[user.role];
  return (
    <div>
      <Layout />
    </div>
  );
}
