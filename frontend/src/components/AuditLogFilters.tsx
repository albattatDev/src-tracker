import type { ReactNode } from "react";
import { AUDIT_ACTIONS, ENTITY_TYPES } from "../api/audit";
import { useAuditUsers } from "../hooks/useAuditLog";
import type { AuditFilterKey, AuditUrlState } from "../hooks/useAuditLogListParams";
import { entityLabel } from "../utils/auditLinks";
import { AUDIT_ACTION_DISPLAY } from "./Badges";

const CONTROL = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      {children}
    </label>
  );
}

export default function AuditLogFilters({
  state,
  hasFilters,
  onFilterChange,
  onClear,
}: {
  state: AuditUrlState;
  hasFilters: boolean;
  onFilterChange: (key: AuditFilterKey, value: string) => void;
  onClear: () => void;
}) {
  const users = useAuditUsers();
  // The URL may name a user who has not loaded yet. Keep the choice visible.
  const selectedIsListed = users.data?.some((u) => u.id === state.user) ?? false;

  return (
    <section
      aria-label="Filters"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3"
    >
      <Field label="Entity type">
        <select
          value={state.entity ?? ""}
          onChange={(e) => onFilterChange("entity", e.target.value)}
          className={CONTROL}
        >
          <option value="">All</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {entityLabel(t)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Action">
        <select
          value={state.action ?? ""}
          onChange={(e) => onFilterChange("action", e.target.value)}
          className={CONTROL}
        >
          <option value="">All</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_DISPLAY[a].label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="User">
        <select
          value={state.user?.toString() ?? ""}
          onChange={(e) => onFilterChange("user", e.target.value)}
          className={CONTROL}
        >
          <option value="">All</option>
          {state.user !== undefined && !selectedIsListed && (
            <option value={state.user}>User #{state.user}</option>
          )}
          {users.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
        {users.isError && (
          <span role="alert" className="font-normal text-red-700">
            Couldn't load users
          </span>
        )}
      </Field>

      <Field label="From">
        <input
          type="date"
          value={state.from ?? ""}
          onChange={(e) => onFilterChange("from", e.target.value)}
          className={CONTROL}
        />
      </Field>

      <Field label="To">
        <input
          type="date"
          value={state.to ?? ""}
          onChange={(e) => onFilterChange("to", e.target.value)}
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
