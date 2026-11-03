import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
// list page are marked stale, so they refetch and show the new state.
export function useServiceRequestMutation<V>(mutationFn: (vars: V) => Promise<SRRead>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-request"] });
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
  });
}
