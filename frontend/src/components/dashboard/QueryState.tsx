import type { ReactNode } from "react";
import type { QueryLike } from "../../hooks/useDashboardLists";
import ErrorAlert from "../ErrorAlert";

export type QueryView<T> =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready"; data: T };

// Where a query is, in the three states the dashboard draws. The one place that decides what
// "loading" means (pending, or no data yet) and what an error without a message says.
export function queryView<T>(query: QueryLike<T>): QueryView<T> {
  if (query.isError) return { kind: "error", message: query.error?.message ?? "Could not load." };
  if (query.isPending || query.data === undefined) return { kind: "loading" };
  return { kind: "ready", data: query.data };
}

// Loading, error with Retry, or the content. For the cards and overview of a dashboard.
export default function QueryState<T>({
  query,
  children,
}: {
  query: QueryLike<T>;
  children: (data: T) => ReactNode;
}) {
  const view = queryView(query);
  if (view.kind === "error") return <ErrorAlert message={view.message} onRetry={() => query.refetch()} />;
  if (view.kind === "loading") return <p className="text-muted">Loading…</p>;
  return <>{children(view.data)}</>;
}
