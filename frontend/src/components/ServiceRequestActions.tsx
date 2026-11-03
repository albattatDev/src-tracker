import { useState } from "react";
import {
  assignServiceRequest,
  changeServiceRequestStatus,
  type SRRead,
  type SRStatus,
} from "../api/serviceRequests";
import { useAuth } from "../hooks/useAuth";
import { useEngineers } from "../hooks/useEngineers";
import { useServiceRequestMutation } from "../hooks/useServiceRequests";
import { availableActions } from "../utils/serviceRequestActions";

const BUTTON =
  "rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50";

// One mutation for every action, so there is one pending state and one error to show.
type Action = { type: "assign"; engineerId: number } | { type: "status"; status: SRStatus };

export default function ServiceRequestActions({ sr }: { sr: SRRead }) {
  const { user } = useAuth();
  const { canAssign, statusAction } = availableActions(user?.role, sr.status);

  const engineers = useEngineers(canAssign);
  const [engineerId, setEngineerId] = useState("");

  const act = useServiceRequestMutation((action: Action) =>
    action.type === "assign"
      ? assignServiceRequest(sr.id, action.engineerId)
      : changeServiceRequestStatus(sr.id, action.status)
  );

  if (!canAssign && !statusAction) return null;

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Actions</h2>

      {canAssign && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="engineer" className="sr-only">
            Engineer
          </label>
          <select
            id="engineer"
            value={engineerId}
            onChange={(e) => setEngineerId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">
              {engineers.isPending ? "Loading engineers…" : "Select engineer…"}
            </option>
            {engineers.data?.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.full_name} ({eng.email})
              </option>
            ))}
          </select>
          <button
            className={BUTTON}
            disabled={!engineerId || act.isPending}
            onClick={() => act.mutate({ type: "assign", engineerId: Number(engineerId) })}
          >
            Assign
          </button>
        </div>
      )}
      {canAssign && engineers.isError && (
        <p className="mb-3 text-sm text-red-700">Could not load engineers.</p>
      )}

      {statusAction && (
        <button
          className={BUTTON}
          disabled={act.isPending}
          onClick={() => act.mutate({ type: "status", status: statusAction.next })}
        >
          {statusAction.label}
        </button>
      )}

      {act.error && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {act.error.message}
        </p>
      )}
    </section>
  );
}
