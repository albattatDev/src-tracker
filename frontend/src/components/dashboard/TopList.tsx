import type { ReactNode } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import type { QueryLike } from "../../hooks/useDashboardLists";
import ErrorAlert from "../ErrorAlert";
import type { ListLayout } from "./listLayout";
import { queryView } from "./QueryState";

// One "Top items" list: a header (title, a few words, "View all"), then loading, error with
// Retry, an empty message, or the rows. Tablet and desktop put it in one bordered panel with a
// table; mobile has no panel and lists cards. `children` draws the rows for the layout it is
// given (so the caller never asks for the breakpoint itself).
// `meta` is the few words after the title; `metaFallback` stands in until there is data.
export default function TopList<T>({
  title,
  meta,
  metaFallback = "",
  viewAll,
  query,
  isEmpty,
  empty,
  children,
}: {
  title: string;
  meta: (data: T) => string;
  metaFallback?: string;
  viewAll: { to: string; label: string };
  query: QueryLike<T>;
  isEmpty: (data: T) => boolean;
  empty: { title: string; text: string };
  children: (data: T, layout: ListLayout) => ReactNode;
}) {
  const layout: ListLayout = useBreakpoint() === "mobile" ? "cards" : "table";
  const mobile = layout === "cards";
  const view = queryView(query);
  const state =
    view.kind !== "ready"
      ? view
      : isEmpty(view.data)
        ? ({ kind: "empty" } as const)
        : ({ kind: "rows", data: view.data } as const);

  const header = (
    <div
      className={`flex items-center justify-between gap-3 ${
        mobile ? "mb-2" : "border-b border-line px-5 py-1"
      }`}
    >
      <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-3">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-sm font-normal text-muted">
          {query.data === undefined ? metaFallback : meta(query.data)}
        </span>
      </h3>
      <Link
        to={viewAll.to}
        aria-label={viewAll.label}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap font-medium hover:underline"
      >
        {mobile ? "View all" : viewAll.label}
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
  );

  let body: ReactNode;
  switch (state.kind) {
    case "error":
      body = (
        <div className="p-4">
          <ErrorAlert message={state.message} onRetry={() => query.refetch()} />
        </div>
      );
      break;
    case "loading":
      body = <p className="p-4 text-muted">Loading…</p>;
      break;
    case "empty":
      body = (
        <div className="flex items-center gap-3 p-4 md:px-5 md:py-6">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-button bg-fill text-muted"
          >
            <CircleCheck size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{empty.title}</p>
            <p className="text-ink-soft">{empty.text}</p>
          </div>
        </div>
      );
      break;
    case "rows":
      body = children(state.data, layout);
      break;
  }

  // On mobile the rows are cards that carry their own border; only the loading, empty and error
  // messages need a box.
  if (mobile) {
    return (
      <div>
        {header}
        {state.kind === "rows" ? body : <div className="rounded-card border border-line bg-surface">{body}</div>}
      </div>
    );
  }
  return (
    <div className="min-w-0 overflow-hidden rounded-card border border-line bg-surface">
      {header}
      {body}
    </div>
  );
}
