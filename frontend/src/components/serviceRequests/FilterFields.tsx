import type { ReactNode } from "react";
import { PRIORITIES, SR_STATUSES } from "../../api/serviceRequests";
import { useEngineers } from "../../hooks/useEngineers";
import type { FilterKey, ListParams } from "../../hooks/useServiceRequestListParams";
import { PRIORITY_DISPLAY, STATUS_DISPLAY } from "../Badges";
import { CONTROL, LABEL, type ControlSize } from "../formStyles";
import Select from "../Select";

// The desktop card keeps the two dates narrow so the whole row fits; in the sheet they share
// the width.
const DATE_WIDTH: Record<ControlSize, string> = { md: "w-36", touch: "flex-1" };

function Field({
  label,
  size,
  children,
}: {
  label: string;
  size: ControlSize;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${LABEL[size]}`}>
      {label}
      {children}
    </label>
  );
}

// The filter controls and nothing around them: the desktop card and the mobile sheet lay the
// same fields out their own way. `size` only changes the control height and text size.
export default function FilterFields({
  params,
  canFilterByEngineer,
  onFilterChange,
  size,
}: {
  params: ListParams;
  canFilterByEngineer: boolean;
  onFilterChange: (key: FilterKey, value: string) => void;
  size: ControlSize;
}) {
  const engineers = useEngineers(canFilterByEngineer);
  const selectedEngineerId = params.assigned_engineer_id;
  // The URL may name an engineer that has not loaded yet (or never will). Keep that
  // choice visible instead of letting the select fall back to showing "All".
  const selectedIsListed = engineers.data?.some((e) => e.id === selectedEngineerId) ?? false;
  const control = CONTROL[size];
  const dateWidth = DATE_WIDTH[size];

  return (
    <>
      <Field label="Status" size={size}>
        <Select
          value={params.status ?? ""}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className={control}
        >
          <option value="">All</option>
          {SR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_DISPLAY[s].label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Priority" size={size}>
        <Select
          value={params.priority ?? ""}
          onChange={(e) => onFilterChange("priority", e.target.value)}
          className={control}
        >
          <option value="">All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_DISPLAY[p].label}
            </option>
          ))}
        </Select>
      </Field>

      {canFilterByEngineer && (
        <Field label="Engineer" size={size}>
          <Select
            value={selectedEngineerId?.toString() ?? ""}
            onChange={(e) => onFilterChange("assigned_engineer_id", e.target.value)}
            className={control}
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
          </Select>
          {engineers.isError && (
            <span role="alert" className="font-normal text-red-700">
              Couldn't load engineers
            </span>
          )}
        </Field>
      )}

      <div role="group" aria-label="Created" className="flex flex-col gap-1.5">
        <span className={LABEL[size]}>Created</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Created from"
            value={params.created_from ?? ""}
            onChange={(e) => onFilterChange("created_from", e.target.value)}
            className={`pr-3 min-w-0 ${dateWidth} ${control}`}
          />
          <span className="text-sm text-muted">to</span>
          <input
            type="date"
            aria-label="Created to"
            value={params.created_to ?? ""}
            onChange={(e) => onFilterChange("created_to", e.target.value)}
            className={`pr-3 min-w-0 ${dateWidth} ${control}`}
          />
        </div>
      </div>
    </>
  );
}
