import type { ReactNode } from "react";
import { PRIORITIES, SR_STATUSES } from "../api/serviceRequests";
import { useEngineers } from "../hooks/useEngineers";
import type { FilterKey, ListParams } from "../hooks/useServiceRequestListParams";
import { PRIORITY_DISPLAY, STATUS_DISPLAY } from "./Badges";

const CONTROL = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      {children}
    </label>
  );
}

export default function ServiceRequestFilters({
  params,
  hasFilters,
  canFilterByEngineer,
  onFilterChange,
  onClear,
}: {
  params: ListParams;
  hasFilters: boolean;
  canFilterByEngineer: boolean;
  onFilterChange: (key: FilterKey, value: string) => void;
  onClear: () => void;
}) {
  const engineers = useEngineers(canFilterByEngineer);
  const selectedEngineerId = params.assigned_engineer_id;
  // The URL may name an engineer that has not loaded yet (or never will). Keep that
  // choice visible instead of letting the select fall back to showing "All".
  const selectedIsListed = engineers.data?.some((e) => e.id === selectedEngineerId) ?? false;

  return (
    <section
      aria-label="Filters"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3"
    >
      <Field label="Status">
        <select
          value={params.status ?? ""}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className={CONTROL}
        >
          <option value="">All</option>
          {SR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_DISPLAY[s].label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Priority">
        <select
          value={params.priority ?? ""}
          onChange={(e) => onFilterChange("priority", e.target.value)}
          className={CONTROL}
        >
          <option value="">All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_DISPLAY[p].label}
            </option>
          ))}
        </select>
      </Field>

      {canFilterByEngineer && (
        <Field label="Engineer">
          <select
            value={selectedEngineerId?.toString() ?? ""}
            onChange={(e) => onFilterChange("assigned_engineer_id", e.target.value)}
            className={CONTROL}
          >
            <option value="">All</option>
            {selectedEngineerId !== undefined && !selectedIsListed && (
              <option value={selectedEngineerId}>Engineer #{selectedEngineerId}</option>
            )}
            {engineers.data?.map((engineer) => (
              <option key={engineer.id} value={engineer.id}>
                {engineer.full_name}
              </option>
            ))}
          </select>
          {engineers.isError && (
            <span role="alert" className="font-normal text-red-700">
              Couldn't load engineers
            </span>
          )}
        </Field>
      )}

      <Field label="Created from">
        <input
          type="date"
          value={params.created_from ?? ""}
          onChange={(e) => onFilterChange("created_from", e.target.value)}
          className={CONTROL}
        />
      </Field>

      <Field label="Created to">
        <input
          type="date"
          value={params.created_to ?? ""}
          onChange={(e) => onFilterChange("created_to", e.target.value)}
          className={CONTROL}
        />
      </Field>

      <button
        onClick={onClear}
        disabled={!hasFilters}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear
      </button>
    </section>
  );
}
