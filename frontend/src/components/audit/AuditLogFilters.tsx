import type { AuditFilterKey, AuditUrlState } from "../../hooks/useAuditLogListParams";
import { buttonClass } from "../buttonStyles";
import AuditFilterFields from "./AuditFilterFields";

// Desktop filters: one white card, the fields in a wrapping row, then Clear.
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
  return (
    <section
      aria-label="Filters"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <AuditFilterFields
        state={state}
        onFilterChange={onFilterChange}
        size="md"
        className="flex flex-wrap items-end gap-3"
      />
      <button type="button" onClick={onClear} disabled={!hasFilters} className={buttonClass("ghost", "md")}>
        Clear
      </button>
    </section>
  );
}
