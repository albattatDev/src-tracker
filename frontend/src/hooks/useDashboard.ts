import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../api/dashboard";

// No polling or push: the page's Refresh button calls refetch().
export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
}
