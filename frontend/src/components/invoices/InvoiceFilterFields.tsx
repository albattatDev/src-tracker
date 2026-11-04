import type { ReactNode } from "react";
import { AGING_BANDS, APPROVAL_STATUSES } from "../../api/invoices";
import type { InvoiceFilterKey, InvoiceUrlState } from "../../hooks/useInvoiceListParams";
import { AGING_DISPLAY, APPROVAL_DISPLAY } from "../Badges";
import { LABEL, type ControlSize } from "../formStyles";
import Select from "../Select";

function Field({ label, size, children }: { label: string; size: ControlSize; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${LABEL[size]}`}>
      {label}
      {children}
    </label>
  );
}

// The Status and Aging band selects, shared by the desktop card and the mobile sheet.
export default function InvoiceFilterFields({
  state,
  onFilterChange,
  size,
}: {
  state: InvoiceUrlState;
  onFilterChange: (key: InvoiceFilterKey, value: string) => void;
  size: ControlSize;
}) {
  return (
    <>
      <Field label="Status" size={size}>
        <Select
          fieldSize={size}
          value={state.status ?? ""}
          onChange={(e) => onFilterChange("status", e.target.value)}
        >
          <option value="">All</option>
          {APPROVAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPROVAL_DISPLAY[s].label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Aging band" size={size}>
        <Select
          fieldSize={size}
          value={state.band ?? ""}
          onChange={(e) => onFilterChange("band", e.target.value)}
        >
          <option value="">All</option>
          {AGING_BANDS.map((b) => (
            <option key={b} value={b}>
              {AGING_DISPLAY[b].label}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
