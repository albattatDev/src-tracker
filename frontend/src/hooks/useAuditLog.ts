import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAuditEntry, listAuditLog, listAuditUsers, type AuditListParams } from "../api/audit";

export function useAuditLog(params: AuditListParams) {
  return useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => listAuditLog(params),
    placeholderData: keepPreviousData,
  });
}

export function useAuditUsers() {
  return useQuery({
    queryKey: ["audit-log-users"],
    queryFn: listAuditUsers,
    staleTime: 60 * 1000,
  });
}

// One entry by id, so a deep link works even when the entry is not on the loaded list page.
export function useAuditEntry(id: number) {
  return useQuery({
    queryKey: ["audit-log", "entry", id],
    queryFn: () => getAuditEntry(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}
