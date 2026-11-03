import { useSearchParams } from "react-router-dom";
import type { ContractorListParams } from "../api/contractors";

export const CONTRACTOR_PAGE_SIZE = 20;

export const ACTIVE_FILTERS = ["active", "inactive", "all"] as const;
export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];

export type ContractorFilterKey = "status" | "q";

function positiveInt(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 ? number : undefined;
}

export interface ContractorUrlState {
  status: ActiveFilter; // no "status" in the URL means "active"
  q: string;
  page: number;
}

// The URL is the single source of truth. Bad values typed by hand are ignored.
export function useContractorListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get("status");
  const state: ContractorUrlState = {
    status: ACTIVE_FILTERS.find((item) => item === rawStatus) ?? "active",
    q: (searchParams.get("q") ?? "").slice(0, 200),
    page: positiveInt(searchParams.get("page")) ?? 1,
  };

  const apiParams: ContractorListParams = {
    q: state.q.trim() || undefined,
    is_active: state.status === "all" ? undefined : state.status === "active",
    page: state.page,
    page_size: CONTRACTOR_PAGE_SIZE,
  };

  const hasFilters = state.status !== "active" || state.q !== "";

  function setFilter(key: ContractorFilterKey, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        // The default is kept out of the URL, so a clean /contractors means "active".
        if (value === "" || (key === "status" && value === "active")) next.delete(key);
        else next.set(key, value);
        next.delete("page");
        return next;
      },
      { replace: key === "q" }
    );
  }

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("status");
      next.delete("q");
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

  function clampPage(lastPage: number) {
    if (state.page <= lastPage) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (lastPage === 1) next.delete("page");
        else next.set("page", String(lastPage));
        return next;
      },
      { replace: true }
    );
  }

  return { state, apiParams, hasFilters, setFilter, clearFilters, setPage, clampPage };
}
