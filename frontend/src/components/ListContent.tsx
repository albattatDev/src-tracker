import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import ErrorAlert from "./ErrorAlert";

// The loading / error / empty switch of a list page. `children` runs only when the list has
// rows. `waiting` keeps the loading state up while something else is settling (a page past the
// end being clamped).
export default function ListContent<T extends { total: number }>({
  query,
  waiting = false,
  empty,
  children,
}: {
  query: UseQueryResult<T>;
  waiting?: boolean;
  empty: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending || waiting) return <p className="text-muted">Loading…</p>;
  if (query.isError) return <ErrorAlert message={query.error.message} onRetry={() => query.refetch()} />;
  if (query.data.total === 0) {
    return <p className="rounded-xl border border-line bg-surface p-6 text-center text-ink-soft">{empty}</p>;
  }
  return <>{children(query.data)}</>;
}
