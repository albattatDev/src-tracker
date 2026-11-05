import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AuditDetailRoute from "./components/audit/AuditDetailRoute";
import ContractorDetailRoute from "./components/contractors/ContractorDetailRoute";
import InvoiceDetailRoute from "./components/invoices/InvoiceDetailRoute";
import NewRequestRoute from "./components/serviceRequests/NewRequestRoute";
import ServiceRequestDetailRoute from "./components/serviceRequests/ServiceRequestDetailRoute";
import { RequireAuth, RequireRole } from "./components/RouteGuards";
import AuditLogPage from "./pages/AuditLogPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import ContractorsPage from "./pages/ContractorsPage";
import DashboardPage from "./pages/DashboardPage";
import InvoicesPage from "./pages/InvoicesPage";
import LoginPage from "./pages/LoginPage";
import ServiceRequestsPage from "./pages/ServiceRequestsPage";
import UsersPage from "./pages/UsersPage";
import { NAV_ITEMS } from "./navigation";
import { AUDIT_BASE, CONTRACTORS_BASE, INVOICES_BASE, SR_BASE, USERS_BASE } from "./routes";
import { CREATE_REQUEST_ROLES } from "./utils/permissions";

// Pages that are built. Any nav item not listed here still shows "Coming soon".
const PAGES: Record<string, ReactElement> = {
  "/dashboard": <DashboardPage />,
  [SR_BASE]: <ServiceRequestsPage />,
  [INVOICES_BASE]: <InvoicesPage />,
  [CONTRACTORS_BASE]: <ContractorsPage />,
  [AUDIT_BASE]: <AuditLogPage />,
  [USERS_BASE]: <UsersPage />,
};

// Pages that open something over or beside the list. The list stays mounted and renders the
// child in its <Outlet />. `new` is only for operations and managers. A static path outranks
// :id, so "new" is never read as an id.
const PAGE_CHILDREN: Record<string, ReactElement> = {
  [SR_BASE]: (
    <>
      <Route element={<RequireRole roles={CREATE_REQUEST_ROLES} />}>
        <Route path="new" element={<NewRequestRoute />} />
      </Route>
      <Route path=":id" element={<ServiceRequestDetailRoute />} />
    </>
  ),
  [INVOICES_BASE]: <Route path=":id" element={<InvoiceDetailRoute />} />,
  [CONTRACTORS_BASE]: <Route path=":id" element={<ContractorDetailRoute />} />,
  [AUDIT_BASE]: <Route path=":id" element={<AuditDetailRoute />} />,
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
