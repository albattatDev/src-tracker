import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import NewRequestRoute from "./components/serviceRequests/NewRequestRoute";
import ServiceRequestDetailRoute from "./components/serviceRequests/ServiceRequestDetailRoute";
import { RequireAuth, RequireRole } from "./components/RouteGuards";
import AuditLogPage from "./pages/AuditLogPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import ContractorDetailPage from "./pages/ContractorDetailPage";
import ContractorsPage from "./pages/ContractorsPage";
import DashboardPage from "./pages/DashboardPage";
import InvoicesPage from "./pages/InvoicesPage";
import LoginPage from "./pages/LoginPage";
import ServiceRequestsPage from "./pages/ServiceRequestsPage";
import UsersPage from "./pages/UsersPage";
import { NAV_ITEMS } from "./navigation";
import { CREATE_REQUEST_ROLES, VIEW_CONTRACTORS_ROLES } from "./utils/permissions";

// Pages that are built. Any nav item not listed here still shows "Coming soon".
const PAGES: Record<string, ReactElement> = {
  "/dashboard": <DashboardPage />,
  "/service-requests": <ServiceRequestsPage />,
  "/invoices": <InvoicesPage />,
  "/contractors": <ContractorsPage />,
  "/audit-log": <AuditLogPage />,
  "/users": <UsersPage />,
};

// Pages that open something over or beside the list. The list stays mounted and renders the
// child in its <Outlet />. `new` is only for operations and managers. A static path outranks
// :id, so "new" is never read as an id.
const PAGE_CHILDREN: Record<string, ReactElement> = {
  "/service-requests": (
    <>
      <Route element={<RequireRole roles={CREATE_REQUEST_ROLES} />}>
        <Route path="new" element={<NewRequestRoute />} />
      </Route>
      <Route path=":id" element={<ServiceRequestDetailRoute />} />
    </>
  ),
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {NAV_ITEMS.map((item) => (
            <Route key={item.path} element={<RequireRole roles={item.roles} />}>
              <Route
                path={item.path}
                element={PAGES[item.path] ?? <ComingSoonPage title={item.label} />}
              >
                {PAGE_CHILDREN[item.path]}
              </Route>
            </Route>
          ))}
          <Route element={<RequireRole roles={VIEW_CONTRACTORS_ROLES} />}>
            <Route path="/contractors/:id" element={<ContractorDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
