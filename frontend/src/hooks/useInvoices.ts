import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveInvoice,
  createInvoice,
  getInvoice,
  listInvoices,
  rejectInvoice,
  type Decision,
  type InvoiceCreate,
  type InvoiceOut,
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

// One invoice for the detail panel. A bad id such as /invoices/abc never reaches the API.
export function useInvoice(id: number) {
  return useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: () => getInvoice(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

// Any invoice write. On success every cached invoice list is marked stale, so the
// Invoices page and the SR detail table both refetch. The optional onSuccess lives on the
// mutation itself (not on mutate()), so it still runs if the component that started it has
// unmounted: an approved invoice can leave a filtered list and take its table with it.
function useInvoiceMutation<V, R>(
  mutationFn: (vars: V) => Promise<R>,
  onSuccess?: (result: R, vars: V) => void
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (result, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess?.(result, vars);
    },
  });
}

export const useCreateInvoice = () => useInvoiceMutation((data: InvoiceCreate) => createInvoice(data));

type DecideVars = { id: number; decision: Decision };

export const useDecideInvoice = (onSuccess?: (invoice: InvoiceOut, vars: DecideVars) => void) =>
  useInvoiceMutation(
    (vars: DecideVars) =>
      vars.decision === "approve" ? approveInvoice(vars.id) : rejectInvoice(vars.id),
    onSuccess
  );
