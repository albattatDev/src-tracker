import { useEffect, useState, type ReactNode } from "react";
import {
  ACTIVE_FILTERS,
  type ActiveFilter,
  type ContractorFilterKey,
  type ContractorUrlState,
} from "../hooks/useContractorListParams";
import Select from "./Select";

const CONTROL = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

const STATUS_LABELS: Record<ActiveFilter, string> = {
  active: "Active",
  inactive: "Inactive",
  all: "All",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      {children}
    </label>
  );
}

export default function ContractorFilters({
  state,
  hasFilters,
  onFilterChange,
  onClear,
}: {
  state: ContractorUrlState;
  hasFilters: boolean;
  onFilterChange: (key: ContractorFilterKey, value: string) => void;
  onClear: () => void;
}) {
  // The box keeps what is typed; the URL (and so the API call) follows after a short pause.
  const [text, setText] = useState(state.q);
  useEffect(() => setText(state.q), [state.q]); // Clear, Back/Forward

  useEffect(() => {
    if (text === state.q) return;
    const timer = setTimeout(() => onFilterChange("q", text), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <section
      aria-label="Filters"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3"
    >
      <Field label="Name">
        <input
          type="search"
          value={text}
          maxLength={200}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search…"
          className={CONTROL}
        />
      </Field>

      <Field label="Status">
        <Select
          value={state.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className={CONTROL}
        >
          {ACTIVE_FILTERS.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
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
