import { useSearchParams } from "react-router-dom";
import {
  AGING_BANDS,
  APPROVAL_STATUSES,
  type AgingBand,
  type ApprovalStatus,
  type InvoiceListParams,
} from "../api/invoices";

export const INVOICE_PAGE_SIZE = 20;

// URL keys are short (status, band, q); they map to the API's approval_status / aging_band.
export type InvoiceFilterKey = "status" | "band" | "q";
const FILTER_KEYS: InvoiceFilterKey[] = ["status", "band", "q"];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function positiveInt(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 ? number : undefined;
}

export interface InvoiceUrlState {
  status?: ApprovalStatus;
  band?: AgingBand;
  q: string;
  page: number;
}

// The URL is the single source of truth. Bad values typed by hand are ignored.
export function useInvoiceListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state: InvoiceUrlState = {
    status: oneOf(searchParams.get("status"), APPROVAL_STATUSES),
    band: oneOf(searchParams.get("band"), AGING_BANDS),
    q: (searchParams.get("q") ?? "").slice(0, 50),
    page: positiveInt(searchParams.get("page")) ?? 1,
  };

  const apiParams: InvoiceListParams = {
    approval_status: state.status,
    aging_band: state.band,
    q: state.q.trim() || undefined,
    sort: "created_at",
    order: "desc",
    page: state.page,
    page_size: INVOICE_PAGE_SIZE,
  };

  const hasFilters = state.status !== undefined || state.band !== undefined || state.q !== "";

  function setFilter(key: InvoiceFilterKey, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "") next.delete(key);
        else next.set(key, value);
        next.delete("page");
        return next;
      },
      // Typing in the search box should not add one history entry per keystroke.
      { replace: key === "q" }
    );
  }

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of FILTER_KEYS) next.delete(key);
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
