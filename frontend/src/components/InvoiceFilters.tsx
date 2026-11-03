import { useEffect, useState, type ReactNode } from "react";
import { AGING_BANDS, APPROVAL_STATUSES } from "../api/invoices";
import type { InvoiceFilterKey, InvoiceUrlState } from "../hooks/useInvoiceListParams";
import { AGING_DISPLAY, APPROVAL_DISPLAY } from "./Badges";

const CONTROL = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      {children}
    </label>
  );
}

export default function InvoiceFilters({
  state,
  hasFilters,
  onFilterChange,
  onClear,
}: {
  state: InvoiceUrlState;
  hasFilters: boolean;
  onFilterChange: (key: InvoiceFilterKey, value: string) => void;
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
      <Field label="Status">
        <select
          value={state.status ?? ""}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className={CONTROL}
        >
          <option value="">All</option>
          {APPROVAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPROVAL_DISPLAY[s].label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Aging band">
        <select
          value={state.band ?? ""}
          onChange={(e) => onFilterChange("band", e.target.value)}
          className={CONTROL}
        >
          <option value="">All</option>
          {AGING_BANDS.map((b) => (
            <option key={b} value={b}>
              {AGING_DISPLAY[b].label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Invoice number">
        <input
          type="search"
          value={text}
          maxLength={50}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search…"
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
      {state.band && (
        <p className="basis-full text-xs text-gray-500">
          Only pending invoices have an aging band, so approved and rejected ones are not listed here.
        </p>
      )}
    </section>
  );
}
