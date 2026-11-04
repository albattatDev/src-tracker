import type { ReactNode } from "react";
import ErrorAlert from "../ErrorAlert";
import type { DetailStatus } from "./detailStatus";

// The body of a detail view: the loading, not-found and error states, or `children(record)`
// once it is there. It never fetches; see detailStatus.ts for where a status comes from.
// Sits inside DetailShell's padded body, so the messages add no padding of their own.
export default function DetailState<T>({
  status,
  notFoundText,
  children,
}: {
  status: DetailStatus<T>;
  notFoundText: string;
  children: (data: T) => ReactNode;
}) {
  switch (status.kind) {
    case "loading":
      return <p className="text-muted">Loading…</p>;
    case "not-found":
      return <p className="text-ink-soft">{notFoundText}</p>;
    case "error":
      return <ErrorAlert message={status.message} onRetry={status.retry} />;
    case "ready":
      return <>{children(status.data)}</>;
  }
}
