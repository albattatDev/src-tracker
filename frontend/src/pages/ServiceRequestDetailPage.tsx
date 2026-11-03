import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import ServiceRequestActions from "../components/ServiceRequestActions";
import { useServiceRequest } from "../hooks/useServiceRequests";
import { formatRiyadh } from "../utils/dates";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export default function ServiceRequestDetailPage() {
  const id = Number(useParams().id);
  const query = useServiceRequest(id);

  const backLink = (
    <Link to="/service-requests" className="text-sm text-gray-600 hover:text-gray-900">
      ← Back to list
    </Link>
  );

  // A non-numeric id never reaches the API (the query is disabled), so it is "not found" too.
  const notFound = !query.isEnabled || (query.isError && query.error.status === 404);
  if (notFound) {
    return (
      <div>
        {backLink}
        <p className="mt-4 text-gray-700">Request not found</p>
      </div>
    );
  }
  if (query.isPending) return <p className="text-gray-600">Loading…</p>;
  if (query.isError) {
    return (
      <div>
        {backLink}
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="mb-2">{query.error.message}</p>
          <button
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            onClick={() => query.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sr = query.data;
  return (
    <div className="max-w-3xl">
      {backLink}
      <h1 className="mb-4 mt-2 text-xl font-semibold text-gray-900">
        #{sr.id} · {sr.title}
      </h1>

      <dl className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <Field label="Status">
          <StatusBadge status={sr.status} />
        </Field>
        <Field label="Priority">
          <PriorityBadge priority={sr.priority} />
        </Field>
        <Field label="Requester">{sr.requester_name}</Field>
        <Field label="Engineer">{sr.assigned_engineer_name ?? "—"}</Field>
        <Field label="Created">{formatRiyadh(sr.created_at)}</Field>
        <Field label="Updated">{formatRiyadh(sr.updated_at)}</Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <p className="whitespace-pre-wrap">{sr.description}</p>
          </Field>
        </div>
      </dl>

      <ServiceRequestActions sr={sr} />
    </div>
  );
}
