import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listAuditLog, listAuditUsers, type AuditListParams } from "../api/audit";

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
