import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { AuditFilterKey, AuditUrlState } from "../../hooks/useAuditLogListParams";
import { buttonClass } from "../buttonStyles";
import AuditFilterSheet from "./AuditFilterSheet";

// The mobile row under the top bar: the Filters button, which opens the sheet.
export default function AuditMobileToolbar({
  state,
  hasFilters,
  total,
  onFilterChange,
  onClear,
}: {
  state: AuditUrlState;
  hasFilters: boolean;
  total: number;
  onFilterChange: (key: AuditFilterKey, value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={buttonClass("secondary", "touch")}
        >
          <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
          Filters
        </button>
      </div>
      {open && (
        <AuditFilterSheet
          state={state}
          hasFilters={hasFilters}
          total={total}
          onFilterChange={onFilterChange}
          onClear={onClear}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
