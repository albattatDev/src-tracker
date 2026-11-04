import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { PersonName } from "../components/Avatar";
import { buttonClass } from "../components/buttonStyles";
import ConfirmDialog from "../components/ConfirmDialog";
import ContractorDocuments from "../components/ContractorDocuments";
import ContractorFormDialog from "../components/ContractorFormDialog";
import ContractorStatusBadge from "../components/ContractorStatusBadge";
import { useAuth } from "../hooks/useAuth";
import { canWriteContractors } from "../utils/permissions";
import { useContractor, useUpdateContractor } from "../hooks/useContractors";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export default function ContractorDetailPage() {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const canWrite = canWriteContractors(user?.role);
  const query = useContractor(id);
  const update = useUpdateContractor(id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const backLink = (
    <Link to="/contractors" className="text-sm text-gray-600 hover:text-gray-900">
      ← Back to list
    </Link>
  );

  // A non-numeric id never reaches the API (the query is disabled), so it is "not found" too.
  const notFound = !query.isEnabled || (query.isError && query.error.status === 404);
  if (notFound) {
    return (
      <div>
        {backLink}
        <p className="mt-4 text-gray-700">Contractor not found</p>
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

  const contractor = query.data;
  const activating = !contractor.is_active; // the button flips: Deactivate <-> Reactivate

  function openConfirm() {
    update.reset(); // an old error must not show up in the next dialog
    setConfirming(true);
  }

  return (
    <div className="max-w-4xl">
      {backLink}
      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{contractor.name}</h1>
        {canWrite && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className={buttonClass("secondary")}>
              Edit
            </button>
            <button
              onClick={openConfirm}
              className={buttonClass(activating ? "secondary" : "danger")}
            >
              {activating ? "Reactivate" : "Deactivate"}
            </button>
          </div>
        )}
      </div>

      <dl className="mb-6 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <Field label="Contact email">{contractor.contact_email}</Field>
        <Field label="Internal manager">
          <PersonName name={contractor.internal_manager_name} />
        </Field>
        <Field label="Status">
          <ContractorStatusBadge isActive={contractor.is_active} />
        </Field>
      </dl>

      <h2 className="mb-3 text-sm font-semibold text-gray-900">Safety documents</h2>
      <ContractorDocuments
        contractorId={contractor.id}
        documents={contractor.current_documents}
        canWrite={canWrite}
        isActive={contractor.is_active}
      />

      {editing && <ContractorFormDialog contractor={contractor} onClose={() => setEditing(false)} />}
      {confirming && (
        <ConfirmDialog
          title={activating ? "Reactivate contractor" : "Deactivate contractor"}
          message={
            activating
              ? `Reactivate ${contractor.name}? Documents can be uploaded to it again.`
              : `Deactivate ${contractor.name}? It stays in the system with its documents, but no new documents can be uploaded until it is reactivated.`
          }
          confirmLabel={
            update.isPending
              ? activating
                ? "Reactivating…"
                : "Deactivating…"
              : activating
                ? "Reactivate"
                : "Deactivate"
          }
          tone={activating ? "approve" : "reject"}
          onConfirm={() =>
            update.mutate({ is_active: activating }, { onSuccess: () => setConfirming(false) })
          }
          onCancel={() => setConfirming(false)}
          isLoading={update.isPending}
          error={update.error?.message ?? null}
        />
      )}
    </div>
  );
}
