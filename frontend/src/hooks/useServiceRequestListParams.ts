import { useSearchParams } from "react-router-dom";
import {
  PRIORITIES,
  SORT_FIELDS,
  SORT_ORDERS,
  SR_STATUSES,
  type SRListParams,
  type SRSortField,
} from "../api/serviceRequests";

export const PAGE_SIZE = 20;

// What the URL always resolves to: filters may be missing, but sort, order and page never are.
export type ListParams = SRListParams &
  Required<Pick<SRListParams, "sort" | "order" | "page" | "page_size">>;

const FILTER_KEYS = [
  "status",
  "priority",
  "assigned_engineer_id",
  "created_from",
  "created_to",
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Anything in the URL can be typed by hand, so every value is checked.
// A bad value is ignored (treated as "not set") instead of being sent to the API.
function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function positiveInt(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 ? number : undefined;
}

function dateOrUndefined(value: string | null): string | undefined {
  return value !== null && DATE_PATTERN.test(value) ? value : undefined;
}

function paramsFromUrl(searchParams: URLSearchParams): ListParams {
  return {
    status: oneOf(searchParams.get("status"), SR_STATUSES),
    priority: oneOf(searchParams.get("priority"), PRIORITIES),
    assigned_engineer_id: positiveInt(searchParams.get("assigned_engineer_id")),
    created_from: dateOrUndefined(searchParams.get("created_from")),
    created_to: dateOrUndefined(searchParams.get("created_to")),
    sort: oneOf(searchParams.get("sort"), SORT_FIELDS) ?? "created_at",
    order: oneOf(searchParams.get("order"), SORT_ORDERS) ?? "desc",
    page: positiveInt(searchParams.get("page")) ?? 1,
    page_size: PAGE_SIZE,
  };
}

// The URL query string is the single source of truth for the list's filters, sort and page.
// Every change that is not a page move also drops `page`, so it starts again at page 1.
export function useServiceRequestListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = paramsFromUrl(searchParams);
  const hasFilters = FILTER_KEYS.some((key) => params[key] !== undefined);

  function setFilter(key: FilterKey, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "") next.delete(key);
      else next.set(key, value);
      next.delete("page");
      return next;
    });
  }

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of FILTER_KEYS) next.delete(key);
      next.delete("page");
      return next;
    });
  }

  function toggleSort(field: SRSortField) {
    const order = params.sort === field && params.order === "desc" ? "asc" : "desc";
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sort", field);
      next.set("order", order);
      next.delete("page");
      return next;
    });
  }

  function setPage(page: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(page));
      return next;
    });
  }


  return { params, hasFilters, setFilter, clearFilters, toggleSort, setPage };
}
