import { AUDIT_ACTIONS, ENTITY_TYPES } from "../../api/audit";
import { useAuditUsers } from "../../hooks/useAuditLog";
import type { AuditFilterKey, AuditUrlState } from "../../hooks/useAuditLogListParams";
import { entityLabel } from "../../utils/auditLinks";
import { AUDIT_ACTION_DISPLAY } from "../Badges";
import { CONTROL, LABEL, type ControlSize } from "../formStyles";
import Select from "../Select";

// The five audit filters, shared by the desktop card and the mobile sheet. `size` is the
// control size; the layout around the fields belongs to the caller. Each field is a block of
// its own so a caller can lay them out in a row, a column or a two-column grid.
export default function AuditFilterFields({
  state,
  onFilterChange,
  size,
  className,
}: {
  state: AuditUrlState;
  onFilterChange: (key: AuditFilterKey, value: string) => void;
  size: ControlSize;
  className: string; // the layout of the fields: flex row, column, ...
}) {
  const users = useAuditUsers();
  // The URL may name a user who has not loaded yet. Keep the choice visible.
  const selectedIsListed = users.data?.some((u) => u.id === state.user) ?? false;
  const field = `flex flex-col gap-1.5 ${LABEL[size]}`;
  // pr-3: keeps the native calendar icon off the border.
  const date = `${CONTROL[size]} pr-3`;

  return (
    <div className={className}>
      <label className={field}>
        Entity type
        <Select
          fieldSize={size}
          value={state.entity ?? ""}
          onChange={(e) => onFilterChange("entity", e.target.value)}
        >
          <option value="">All</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {entityLabel(t)}
            </option>
          ))}
        </Select>
      </label>

      <label className={field}>
        Action
        <Select
          fieldSize={size}
          value={state.action ?? ""}
          onChange={(e) => onFilterChange("action", e.target.value)}
        >
          <option value="">All</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_DISPLAY[a].label}
            </option>
          ))}
        </Select>
      </label>

      <label className={field}>
        User
        <Select
          fieldSize={size}
          value={state.user?.toString() ?? ""}
          onChange={(e) => onFilterChange("user", e.target.value)}
        >
          <option value="">All</option>
          {state.user !== undefined && !selectedIsListed && <option value={state.user}>User #{state.user}</option>}
          {users.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </Select>
        {users.isError && (
          <span role="alert" className="font-normal text-red-700">
            Couldn't load users
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={field}>
          From
          <input
            type="date"
            value={state.from ?? ""}
            onChange={(e) => onFilterChange("from", e.target.value)}
            className={date}
          />
        </label>
        <label className={field}>
          To
          <input
            type="date"
            value={state.to ?? ""}
            onChange={(e) => onFilterChange("to", e.target.value)}
            className={date}
          />
        </label>
      </div>
    </div>
  );
}
