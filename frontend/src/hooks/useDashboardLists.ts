import { useQuery, useQueries, type UseQueryResult } from "@tanstack/react-query";
import { listAuditLog } from "../api/audit";
import { listContractors, type ContractorListItem } from "../api/contractors";
import { listInvoices } from "../api/invoices";
import {
  PRIORITIES,
  listServiceRequests,
  type Priority,
  type SRPage,
  type SRRead,
} from "../api/serviceRequests";
import { listUsers } from "../api/users";
import { DASHBOARD_KEY } from "./useDashboard";

// The lists and counts under the dashboard cards. They use the list endpoints as they are (no
// new endpoint), with a small page size and an ordering the endpoint already supports. Every
// key starts with DASHBOARD_KEY, so Refresh and every write refresh them together.

export const TOP_COUNT = 5;

// What the dashboard needs from a query. A UseQueryResult has it, and so does the combined
// result of several queries (see combineResults).
export interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => unknown;
}

// The combine step of useQueries: `data` exists once every query has data, built from all of
// them; the other fields summarise the group.
export function combineResults<D, T>(results: UseQueryResult<D>[], build: (data: D[]) => T): QueryLike<T> {
  const pages: D[] = [];
  for (const result of results) {
    if (result.data !== undefined) pages.push(result.data);
  }
  return {
    data: pages.length === results.length ? build(pages) : undefined,
    isPending: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
    error: results.find((result) => result.error)?.error ?? null,
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

// Pending invoices, oldest first (sort=age with order=desc puts the largest age first).
// The API scopes them: an engineer gets only the invoices of their own requests.
export function usePendingInvoices() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "invoices-pending"],
    queryFn: () =>
      listInvoices({
        approval_status: "pending",
        sort: "age",
        order: "desc",
        page_size: TOP_COUNT,
      }),
  });
}

// Requests nobody has taken yet (status open), oldest first.
export function useUnassignedRequests() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "sr-open"],
    queryFn: () =>
      listServiceRequests({ status: "open", sort: "created_at", order: "asc", page_size: TOP_COUNT }),
  });
}

// The engineer's open work: in progress first, then assigned (oldest first), top 5. Two calls
// because the list endpoint takes one status at a time; each is already in the order we show.
export interface OpenRequests {
  items: SRRead[];
  total: number;
}

const OPEN_STATUSES = ["in_progress", "assigned"] as const;

// The order of the rows comes from the API (created_at, oldest first), not from combineOpen:
// each query asks for it. Kept as one constant so a test can check exactly what is requested.
export const OPEN_REQUEST_QUERIES = OPEN_STATUSES.map((status) => ({
  queryKey: [...DASHBOARD_KEY, "sr", status],
  queryFn: () =>
    listServiceRequests({ status, sort: "created_at", order: "asc", page_size: TOP_COUNT }),
}));

export function combineOpen(results: UseQueryResult<SRPage>[]) {
  return combineResults<SRPage, OpenRequests>(results, (pages) => ({
    items: pages.flatMap((page) => page.items).slice(0, TOP_COUNT),
    total: pages.reduce((total, page) => total + page.total, 0),
  }));
}

export function useMyOpenRequests() {
  return useQueries({ queries: OPEN_REQUEST_QUERIES, combine: combineOpen });
}

// The operations user's newest requests (the API only returns their own).
export function useLatestRequests() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "sr-latest"],
    queryFn: () =>
      listServiceRequests({ sort: "created_at", order: "desc", page_size: TOP_COUNT }),
  });
}

// "My requests by priority": the list API has no counts per priority and the dashboard API has
// none either, so ask for one row per priority and read `total`. Three tiny calls.
function combinePriorities(results: UseQueryResult<SRPage>[]) {
  return combineResults<SRPage, Record<Priority, number>>(results, (pages) => {
    const counts: Record<Priority, number> = { low: 0, medium: 0, high: 0 };
    PRIORITIES.forEach((priority, index) => {
      counts[priority] = pages[index].total;
    });
    return counts;
  });
}

export function useRequestsByPriority() {
  return useQueries({
    queries: PRIORITIES.map((priority) => ({
      queryKey: [...DASHBOARD_KEY, "sr-priority", priority],
      queryFn: () => listServiceRequests({ priority, page_size: 1 }),
    })),
    combine: combinePriorities,
  });
}

// Contractors with a document to act on, expired first.
// GET /contractors caps a page at 100, so "N contractors affected" is computed from at most 100
// contractors. The expired / expiring document COUNTS on the cards come from /dashboard, which
// is the accurate source; this list only says which contractors to open.
export interface ProblemContractors {
  items: ContractorListItem[]; // top 5
  affected: number; // contractors with an expired document (within the first 100)
  needAction: number; // contractors with an expired or expiring document (within the first 100)
}

export function useProblemContractors(enabled = true) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "contractors-problems"],
    enabled,
    queryFn: async (): Promise<ProblemContractors> => {
      const page = await listContractors({ is_active: true, page_size: 100 });
      const problems = page.items
        .filter((c) => c.doc_counts.expired > 0 || c.doc_counts.expiring_soon > 0)
        .sort(
          (a, b) =>
            b.doc_counts.expired - a.doc_counts.expired ||
            b.doc_counts.expiring_soon - a.doc_counts.expiring_soon ||
            a.name.localeCompare(b.name)
        );
      return {
        items: problems.slice(0, TOP_COUNT),
        affected: problems.filter((c) => c.doc_counts.expired > 0).length,
        needAction: problems.length,
      };
    },
  });
}

// Admin: every user (GET /users), counted on the client (see summarizeUsers).
export function useDashboardUsers() {
  return useQuery({ queryKey: [...DASHBOARD_KEY, "users"], queryFn: listUsers });
}

// Admin: the latest entries (the endpoint is already newest first).
export function useRecentActivity() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "audit"],
    queryFn: () => listAuditLog({ page_size: TOP_COUNT }),
  });
}
