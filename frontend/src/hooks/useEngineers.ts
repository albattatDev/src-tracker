import { useQuery } from "@tanstack/react-query";
import { listEngineers } from "../api/users";

// `enabled` is false for roles that may not call /users, so they never get a 403.
export function useEngineers(enabled: boolean) {
  return useQuery({
    queryKey: ["engineers"],
    queryFn: listEngineers,
    enabled,
    staleTime: 5 * 60 * 1000, // the engineer list rarely changes
  });
}
