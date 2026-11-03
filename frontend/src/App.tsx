import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { RequireAuth, RequireRole } from "./components/RouteGuards";
import ComingSoonPage from "./pages/ComingSoonPage";
import LoginPage from "./pages/LoginPage";
import ServiceRequestsPage from "./pages/ServiceRequestsPage";
import { NAV_ITEMS } from "./navigation";

// Pages that are built. Any nav item not listed here still shows "Coming soon".
const PAGES: Record<string, ReactElement> = {
  "/service-requests": <ServiceRequestsPage />,
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
              />
            </Route>
          ))}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
