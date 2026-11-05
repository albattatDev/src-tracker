import { MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api/client";
import { AUDIT_LOG_KEY, AUDIT_USERS_KEY } from "./hooks/useAuditLog";
import { DASHBOARD_KEY } from "./hooks/useDashboard";

// Tells TanStack that every query/mutation error is an ApiError, so `error.status` and
// `error.fieldErrors` are typed everywhere without `instanceof` checks. This holds because
// apiFetch/login only throw ApiError for failed responses.
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

const MAX_RETRIES = 1;

// What every write can change, wherever it is made: the dashboard counts and lists, and the
// audit log (every write adds an entry, and may add a new actor to the filter). This is the one
// place that says so; a write hook never invalidates these itself.
const REFRESHED_AFTER_A_WRITE = [DASHBOARD_KEY, AUDIT_LOG_KEY, AUDIT_USERS_KEY];

// One QueryClient for the whole app: it holds the cache of everything fetched with useQuery.
export const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    // onSettled, NOT onSuccess: a document upload that was cancelled after its last byte was
    // sent can still have reached the server, so the data must be refetched either way.
    // Not awaited on purpose: a mutation stays "pending" until its callbacks return, and its
    // button would keep spinning until the dashboard had refetched.
    onSettled: () => {
      for (const queryKey of REFRESHED_AFTER_A_WRITE) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  }),
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
