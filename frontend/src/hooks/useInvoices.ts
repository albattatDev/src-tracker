import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveInvoice,
  createInvoice,
  listInvoices,
  rejectInvoice,
  type Decision,
  type InvoiceCreate,
  type InvoiceListParams,
} from "../api/invoices";

// The key holds every param, so each filter/page combination is cached separately.
// `enabled` lets the SR detail page skip the call for roles the API would refuse (403).
export function useInvoices(params: InvoiceListParams, enabled = true) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => listInvoices(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

// Any invoice write. On success every cached invoice list is marked stale, so the
// Invoices page and the SR detail table both refetch.
function useInvoiceMutation<V>(mutationFn: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export const useCreateInvoice = () => useInvoiceMutation((data: InvoiceCreate) => createInvoice(data));

export const useDecideInvoice = () =>
  useInvoiceMutation((vars: { id: number; decision: Decision }) =>
    vars.decision === "approve" ? approveInvoice(vars.id) : rejectInvoice(vars.id)
  );
