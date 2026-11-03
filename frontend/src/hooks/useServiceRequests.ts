import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listServiceRequests, type SRListParams } from "../api/serviceRequests";

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
