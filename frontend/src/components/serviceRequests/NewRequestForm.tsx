import { useState, type FormEvent } from "react";
import { createServiceRequest, PRIORITIES, type Priority } from "../../api/serviceRequests";
import { useServiceRequestMutation } from "../../hooks/useServiceRequests";
import { PRIORITY_DISPLAY } from "../Badges";
import { buttonClass } from "../buttonStyles";
import { CONTROL, LABEL, TEXTAREA, type ControlSize } from "../formStyles";
import { useToast } from "../Toast";
import Select from "../Select";

function FieldError({ message }: { message?: string }) {
  return message ? <span className="font-normal text-red-700">{message}</span> : null;
}

// The new request form, shown in a Modal (desktop, tablet) or a BottomSheet (mobile). The
// requester is the logged-in user: the API sets it. `size` only picks control and button size.
export default function NewRequestForm({
  size,
  onCreated,
  onCancel,
}: {
  size: ControlSize;
  onCreated: (id: number) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  // The toast is on the mutation, so it shows even if the dialog was closed meanwhile; opening
  // the new request is on mutate, so it only happens if the dialog is still open.
  const create = useServiceRequestMutation(createServiceRequest, {
    onSuccess: (sr) => toast.show(`Request #${sr.id} created`),
  });
  const fieldErrors = create.error?.fieldErrors ?? {};
  // Show the banner only when the error is not already shown next to a field.
  const showBanner = create.error && Object.keys(fieldErrors).length === 0;
  const buttonSize = size === "touch" ? "touch" : "md";
  const label = `flex flex-col gap-1.5 ${LABEL[size]}`;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate({ title, description, priority }, { onSuccess: (sr) => onCreated(sr.id) });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <label className={label}>
        Title
        <input
          className={CONTROL[size]}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!fieldErrors.title}
        />
        <FieldError message={fieldErrors.title} />
      </label>

      <label className={label}>
        Description
        <textarea
          rows={5}
          className={TEXTAREA[size]}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!fieldErrors.description}
        />
        <FieldError message={fieldErrors.description} />
      </label>

      <label className={label}>
        Priority
        <Select
          fieldSize={size}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_DISPLAY[p].label}
            </option>
          ))}
        </Select>
        <FieldError message={fieldErrors.priority} />
      </label>

      {showBanner && (
        <p role="alert" className="rounded-field border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {create.error.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClass("secondary", buttonSize)}>
          Cancel
        </button>
        <button type="submit" disabled={create.isPending} className={buttonClass("primary", buttonSize)}>
          {create.isPending ? "Creating…" : "Create request"}
        </button>
      </div>
    </form>
  );
}
