import type { AuditLogOut } from "../../api/audit";
import { changedFields, type FieldChange } from "../../utils/auditDiff";
import { LABEL_CLASS } from "../PropertyRow";

// A changed field shows the old value muted and struck through, an arrow, then the new value;
// an added or removed field shows its one value.
function ChangeValue({ change }: { change: FieldChange }) {
  if (change.kind !== "changed") {
    return <>{change.kind === "added" ? change.new : change.old}</>;
  }
  return (
    <>
      <span className="text-muted line-through">{change.old}</span>
      <span aria-hidden="true" className="px-1.5 text-muted">
        →
      </span>
      <span className="sr-only"> changed to </span>
      <span>{change.new}</span>
    </>
  );
}

// The field list of one audit entry. Long values wrap. Desktop puts the field name on the
// left; mobile stacks it above the value.
export default function AuditChanges({ row, mobile }: { row: AuditLogOut; mobile: boolean }) {
  const changes = changedFields(row);
  if (changes.length === 0) return <p className="text-ink-soft">No field changes recorded.</p>;

  return (
    <dl className="divide-y divide-line rounded-xl border border-line">
      {changes.map((change) => {
        const value = (
          <dd className="min-w-0 whitespace-pre-wrap break-words text-sm">
            <ChangeValue change={change} />
          </dd>
        );
        return mobile ? (
          <div key={change.field} className="flex flex-col gap-1 px-4 py-3">
            <dt className={LABEL_CLASS}>{change.label}</dt>
            {value}
          </div>
        ) : (
          <div key={change.field} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-3">
            <dt className="min-w-0 break-words text-sm text-muted">{change.label}</dt>
            {value}
          </div>
        );
      })}
    </dl>
  );
}
