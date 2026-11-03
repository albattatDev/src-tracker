import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createServiceRequest, PRIORITIES, type Priority } from "../api/serviceRequests";
import { PRIORITY_DISPLAY } from "../components/Badges";
import { useServiceRequestMutation } from "../hooks/useServiceRequests";

const INPUT = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-red-700">{message}</p> : null;
}

export default function ServiceRequestCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const create = useServiceRequestMutation(createServiceRequest);
  const error = create.error;
  const fieldErrors = error?.fieldErrors ?? {};
  // Show the banner only when the error is not already shown next to a field.
  const showBanner = error && Object.keys(fieldErrors).length === 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { title, description, priority },
      { onSuccess: (sr) => navigate(`/service-requests/${sr.id}`) }
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New Service Request</h1>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="title"
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!!fieldErrors.title}
          />
          <FieldError message={fieldErrors.title} />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={5}
            className={INPUT}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={!!fieldErrors.description}
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div>
          <label htmlFor="priority" className="mb-1 block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            className={INPUT}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_DISPLAY[p].label}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.priority} />
        </div>

        {showBanner && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error.message}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create request"}
          </button>
          <Link
            to="/service-requests"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
