import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import type { Contractor } from "../api/contractors";
import { useCreateContractor, useUpdateContractor } from "../hooks/useContractors";
import { useManagers } from "../hooks/useManagers";
import Modal from "./Modal";
import Select from "./Select";

const CONTROL = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

// Create when `contractor` is missing, edit otherwise. Only managers get here, so the
// manager list (a manager/admin endpoint) never answers 403.
export default function ContractorFormDialog({
  contractor,
  onClose,
}: {
  contractor?: Contractor;
  onClose: () => void;
}) {
  const [name, setName] = useState(contractor?.name ?? "");
  const [email, setEmail] = useState(contractor?.contact_email ?? "");
  const [managerId, setManagerId] = useState(String(contractor?.internal_manager_id ?? ""));
  const managers = useManagers(true);
  const create = useCreateContractor();
  const update = useUpdateContractor(contractor?.id ?? 0);
  const save = contractor ? update : create;

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const error = (field: string) =>
    fieldErrors[field] && <span className="font-normal text-red-700">{fieldErrors[field]}</span>;

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate(
      {
        name: name.trim(),
        contact_email: email.trim(),
        internal_manager_id: Number(managerId),
      },
      { onSuccess: onClose }
    );
  }

  return (
    <Modal
      title={contractor ? "Edit contractor" : "New contractor"}
      onClose={onClose}
      isBusy={save.isPending}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Name
          <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} className={CONTROL} />
          {error("name")}
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Contact email (receives expiry alerts)
          <input
            required
            type="email"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={CONTROL}
          />
          {error("contact_email")}
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Internal manager
          <Select required value={managerId} onChange={(e) => setManagerId(e.target.value)} className={CONTROL}>
            <option value="">{managers.isPending ? "Loading managers…" : "Select manager…"}</option>
            {managers.data?.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.full_name} ({manager.email})
              </option>
            ))}
          </Select>
          {error("internal_manager_id")}
        </label>

        {managers.isError && (
          <p role="alert" className="text-sm text-red-700">
            Could not load managers: {managers.error.message}
          </p>
        )}
        {save.error && !hasFieldErrors && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {save.error.message}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
