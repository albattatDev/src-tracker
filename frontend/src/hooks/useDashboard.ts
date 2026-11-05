import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../api/dashboard";

// Every query the dashboard owns starts with this key (the summary, each top list, the admin
// users). One invalidation refreshes all of them: the Refresh button, and every write that
// changes what the dashboard counts (an invoice decision, an assign, a status change, a user,
// a document upload) use it.
export const DASHBOARD_KEY = ["dashboard"] as const;

// No polling or push: the page's Refresh button invalidates DASHBOARD_KEY.
export function useDashboard() {
  return useQuery({ queryKey: DASHBOARD_KEY, queryFn: getDashboard });
}
