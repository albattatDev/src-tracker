import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UploadOptions } from "../api/client";
import {
  createContractor,
  getContractor,
  listContractors,
  listDocuments,
  updateContractor,
  uploadDocument,
  type Contractor,
  type ContractorInput,
  type ContractorListParams,
  type ContractorPatch,
  type DocType,
  type UploadInput,
} from "../api/contractors";

// Every key starts with "contractors", so one invalidation refreshes the list, the detail
// page and any open history.
const ROOT = "contractors";

export function useContractors(params: ContractorListParams) {
  return useQuery({
    queryKey: [ROOT, "list", params],
    queryFn: () => listContractors(params),
    placeholderData: keepPreviousData,
  });
}

export function useContractor(id: number) {
  return useQuery({
    queryKey: [ROOT, "detail", id],
    queryFn: () => getContractor(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

// `enabled` keeps the history closed (and un-fetched) until the user opens it.
export function useDocumentHistory(contractorId: number, docType: DocType, enabled: boolean) {
  return useQuery({
    queryKey: [ROOT, "documents", contractorId, docType],
    queryFn: () => listDocuments(contractorId, docType),
    enabled,
  });
}

// `onDone` runs once the save worked, even if the form that started it was closed meanwhile (a
// callback passed to mutate() would be dropped then). The toasts use it.
function useContractorMutation<V>(
  mutationFn: (vars: V) => Promise<Contractor>,
  onDone?: (saved: Contractor) => void
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (saved) => {
      onDone?.(saved);
      return queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
  });
}

export const useCreateContractor = (onDone?: (saved: Contractor) => void) =>
  useContractorMutation((data: ContractorInput) => createContractor(data), onDone);

export const useUpdateContractor = (id: number, onDone?: (saved: Contractor) => void) =>
  useContractorMutation((data: ContractorPatch) => updateContractor(id, data), onDone);

// Not useContractorMutation: it refreshes on settle, not only on success. An upload that was
// cancelled after its last byte was sent can still have reached the server, so the lists must
// be refetched either way.
export function useUploadDocument(contractorId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: UploadInput } & UploadOptions) =>
      uploadDocument(contractorId, vars.data, { onProgress: vars.onProgress, signal: vars.signal }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [ROOT] }),
  });
}
