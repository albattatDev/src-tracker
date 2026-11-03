import { useQuery } from "@tanstack/react-query";
import { listManagers } from "../api/users";

// `enabled` is false for roles that may not call /users, so they never get a 403.
export function useManagers(enabled: boolean) {
  return useQuery({
    queryKey: ["managers"],
    queryFn: listManagers,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
