import { useSearchParams } from "react-router-dom";
import {
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  type AuditAction,
  type AuditListParams,
  type EntityType,
} from "../api/audit";

export const AUDIT_PAGE_SIZE = 20;

// URL keys are short; they map to the API's entity_type / action / user_id / date_from / date_to.
export type AuditFilterKey = "entity" | "action" | "user" | "from" | "to";
const FILTER_KEYS: AuditFilterKey[] = ["entity", "action", "user", "from", "to"];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function positiveInt(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 ? number : undefined;
}

function dateOrUndefined(value: string | null): string | undefined {
  return value !== null && DATE.test(value) ? value : undefined;
}

export interface AuditUrlState {
  entity?: EntityType;
  action?: AuditAction;
  user?: number;
  from?: string;
  to?: string;
  page: number;
}

// The URL is the single source of truth. Bad values typed by hand are ignored.
export function useAuditLogListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state: AuditUrlState = {
    entity: oneOf(searchParams.get("entity"), ENTITY_TYPES),
    action: oneOf(searchParams.get("action"), AUDIT_ACTIONS),
    user: positiveInt(searchParams.get("user")),
    from: dateOrUndefined(searchParams.get("from")),
    to: dateOrUndefined(searchParams.get("to")),
    page: positiveInt(searchParams.get("page")) ?? 1,
  };

  const apiParams: AuditListParams = {
    entity_type: state.entity,
    action: state.action,
    user_id: state.user,
    date_from: state.from,
    date_to: state.to,
    page: state.page,
    page_size: AUDIT_PAGE_SIZE,
  };

  const hasFilters = FILTER_KEYS.some((key) => state[key] !== undefined);

  function setFilter(key: AuditFilterKey, value: string) {
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
