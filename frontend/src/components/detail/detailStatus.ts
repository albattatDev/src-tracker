import type { UseQueryResult } from "@tanstack/react-query";

// Where a detail view is in loading its record. The record can come from anywhere (its own
// query, or a list that is already loaded): whoever feeds the view builds one of these.
export type DetailStatus<T> =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error"; message: string; retry: () => void }
  | { kind: "ready"; data: T };

// For a record with its own query. Data that is already there always wins, even if a background
// refetch failed: stale data stays on screen (and so does an open dialog or the footer), and the
// error state is only for a load that never produced data. A disabled query (an id that is not
// a number) never reaches the API, so it is "not found" too, as is a 404.
export function fromQuery<T>(query: UseQueryResult<T>): DetailStatus<T> {
  if (query.data !== undefined) return { kind: "ready", data: query.data };
  if (!query.isEnabled || (query.isError && query.error.status === 404)) return { kind: "not-found" };
  if (query.isPending) return { kind: "loading" };
  if (query.isError) return { kind: "error", message: query.error.message, retry: () => query.refetch() };
  return { kind: "loading" };
}
