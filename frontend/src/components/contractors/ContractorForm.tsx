import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import type { Contractor } from "../../api/contractors";
import { useCreateContractor, useUpdateContractor } from "../../hooks/useContractors";
import { useManagers } from "../../hooks/useManagers";
import { buttonClass } from "../buttonStyles";
import { CONTROL, LABEL, type ControlSize } from "../formStyles";
import Select from "../Select";
import { useToast } from "../Toast";

function FieldError({ message }: { message?: string }) {
  return message ? <span className="font-normal text-red-700">{message}</span> : null;
}

// Create when `contractor` is missing, edit otherwise. Only managers get here, so the
// manager list (a manager/admin endpoint) never answers 403. Shown in a Modal (desktop,
// tablet) or a BottomSheet (mobile); `size` only picks control and button size.
export default function ContractorForm({
  contractor,
  size,
  onSaved,
  onCancel,
}: {
  contractor?: Contractor;
  size: ControlSize;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(contractor?.name ?? "");
  const [email, setEmail] = useState(contractor?.contact_email ?? "");
  const [managerId, setManagerId] = useState(String(contractor?.internal_manager_id ?? ""));
  const managers = useManagers(true);
  // The toast is on the mutation, so it shows even if the sheet was closed meanwhile.
  const create = useCreateContractor((saved) => toast.show(`${saved.name} created`));
  const update = useUpdateContractor(contractor?.id ?? 0, (saved) => toast.show(`${saved.name} updated`));
  const save = contractor ? update : create;

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const buttonSize = size === "touch" ? "touch" : "md";
  const label = `flex flex-col gap-1.5 ${LABEL[size]}`;

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate(
      {
        name: name.trim(),
        contact_email: email.trim(),
        internal_manager_id: Number(managerId),
      },
      { onSuccess: onSaved }
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className={label}>
        Name
        <input
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!fieldErrors.name}
          className={CONTROL[size]}
        />
        <FieldError message={fieldErrors.name} />
      </label>
      <label className={label}>
        Contact email (receives expiry alerts)
        <input
          required
          type="email"
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!fieldErrors.contact_email}
          className={CONTROL[size]}
        />
        <FieldError message={fieldErrors.contact_email} />
      </label>
      <label className={label}>
        Internal manager
        <Select
          required
          fieldSize={size}
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
        >
          <option value="">{managers.isPending ? "Loading managers…" : "Select manager…"}</option>
          {managers.data?.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.full_name} ({manager.email})
            </option>
          ))}
        </Select>
        <FieldError message={fieldErrors.internal_manager_id} />
      </label>

      {managers.isError && (
        <p role="alert" className="text-sm text-red-700">
          Could not load managers: {managers.error.message}
        </p>
      )}
      {save.error && !hasFieldErrors && (
        <p role="alert" className="rounded-field border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {save.error.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={save.isPending}
          className={buttonClass("secondary", buttonSize)}
        >
          Cancel
        </button>
        <button type="submit" disabled={save.isPending} className={buttonClass("primary", buttonSize)}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
