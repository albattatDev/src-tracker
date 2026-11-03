import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api/client";

// Tells TanStack that every query/mutation error is an ApiError, so `error.status` and
// `error.fieldErrors` are typed everywhere without `instanceof` checks. This holds because
// apiFetch/login only throw ApiError for failed responses.
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

const MAX_RETRIES = 1;

// One QueryClient for the whole app: it holds the cache of everything fetched with useQuery.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once, but never a 4xx: a 404/403/422 gives the same answer the second time.
      // `instanceof` still matters at runtime: a network failure is a TypeError, not an ApiError.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
        failureCount < MAX_RETRIES,
      refetchOnWindowFocus: false, // do not refetch every time the tab regains focus
    },
  },
});
