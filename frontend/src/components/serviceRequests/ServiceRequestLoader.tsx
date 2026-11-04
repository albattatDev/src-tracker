import type { ReactNode } from "react";
import type { SRRead } from "../../api/serviceRequests";
import { useServiceRequest } from "../../hooks/useServiceRequests";
import { buttonClass } from "../buttonStyles";

// Loads one request and shows the loading, not-found and error states, so the panel and the
// mobile screen only write what they show once the request is there.
export default function ServiceRequestLoader({
  id,
  children,
}: {
  id: number;
  children: (sr: SRRead) => ReactNode;
}) {
  const query = useServiceRequest(id);

  // A non-numeric id never reaches the API (the query is disabled), so it is "not found" too.
  const notFound = !query.isEnabled || (query.isError && query.error.status === 404);
  if (notFound) return <p className="text-ink-soft">Request not found</p>;
  if (query.isPending) return <p className="text-muted">Loading…</p>;
  if (query.isError) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="mb-3">{query.error.message}</p>
        <button type="button" onClick={() => query.refetch()} className={buttonClass("primary", "md")}>
          Retry
        </button>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}
