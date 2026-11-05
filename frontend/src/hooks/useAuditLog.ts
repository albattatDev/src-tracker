import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAuditEntry, listAuditLog, listAuditUsers, type AuditListParams } from "../api/audit";

// The audit log's cache keys. queryClient.ts invalidates both after every write; the entry and
// the list are under AUDIT_LOG_KEY, the actors dropdown is its own key.
export const AUDIT_LOG_KEY = ["audit-log"] as const;
export const AUDIT_USERS_KEY = ["audit-log-users"] as const;

export function useAuditLog(params: AuditListParams) {
  return useQuery({
    queryKey: [...AUDIT_LOG_KEY, params],
    queryFn: () => listAuditLog(params),
    placeholderData: keepPreviousData,
  });
}

export function useAuditUsers() {
  return useQuery({
    queryKey: AUDIT_USERS_KEY,
    queryFn: listAuditUsers,
    staleTime: 60 * 1000,
  });
}

// One entry by id, so a deep link works even when the entry is not on the loaded list page.
export function useAuditEntry(id: number) {
  return useQuery({
    queryKey: [...AUDIT_LOG_KEY, "entry", id],
    queryFn: () => getAuditEntry(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}
