import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "../api/client";
import {
  getServiceRequest,
  listServiceRequests,
  type SRListParams,
  type SRRead,
} from "../api/serviceRequests";

// The query key is the cache address. It contains every param, so each combination of
// filters/sort/page is cached separately, and changing any param triggers a new fetch.
export function useServiceRequests(params: SRListParams) {
  return useQuery({
    queryKey: ["service-requests", params],
    queryFn: () => listServiceRequests(params),
    // While the next page loads, keep showing the old rows instead of flashing "Loading".
    placeholderData: keepPreviousData,
  });
}

export function useServiceRequest(id: number) {
  return useQuery({
    queryKey: ["service-request", id],
    queryFn: () => getServiceRequest(id),
    // A URL like /service-requests/abc gives NaN: do not send it to the API.
    enabled: Number.isInteger(id) && id > 0,
  });
}

// Any SR write (create, assign, status change). On success the detail and every cached
// list page are marked stale, so they refetch and show the new state. The optional callbacks
// live on the mutation itself, so they still run if the row that started it has unmounted
// (a status change can move the request out of the list's filter).
export function useServiceRequestMutation<V>(
  mutationFn: (vars: V) => Promise<SRRead>,
  callbacks: { onSuccess?: (sr: SRRead, vars: V) => void; onError?: (error: ApiError) => void } = {}
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (sr, vars) => {
      queryClient.invalidateQueries({ queryKey: ["service-request"] });
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      callbacks.onSuccess?.(sr, vars);
    },
    onError: callbacks.onError,
  });
}
