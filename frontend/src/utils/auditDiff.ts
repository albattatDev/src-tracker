import type { AuditLogOut, ValueLabels } from "../api/audit";
import { formatDateLikeText } from "./dates";

// One field of an entry, ready to show. The kind comes from the data, not the action name: a
// field in both snapshots changed, in only the new one it was added, in only the old one removed.
type FieldChangeData =
  | { kind: "changed"; old: string; new: string }
  | { kind: "added"; new: string }
  | { kind: "removed"; old: string };
export type FieldChange = { field: string; label: string } & FieldChangeData;

type EntryValues = Pick<AuditLogOut, "old_values" | "new_values" | "value_labels">;

// Stored internal fields that mean nothing to a reader (a storage path). The API still sends
// them; they are only left out of what the page shows.
const HIDDEN_FIELDS = new Set(["file_path"]);

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// "contractor_id" -> "Contractor": a reader sees the name of the record, not that it is an id.
function label(field: string): string {
  const base = field.length > 3 && field.endsWith("_id") ? field.slice(0, -3) : field;
  const text = base.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// A value as a reader should see it: a known foreign key shows the name, a datetime shows in
// Riyadh time, a date as a date, anything else as it is.
function display(value: unknown, field: string, labels: ValueLabels): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" || typeof value === "string") {
    const name = labels[field]?.[String(value)];
    if (name !== undefined) return name;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return typeof value === "string" ? formatDateLikeText(value) : String(value);
}

// The fields that changed, in display form. Fields whose value is the same in both snapshots
// and hidden fields are left out.
export function changedFields(row: EntryValues): FieldChange[] {
  const before = row.old_values ?? {};
  const after = row.new_values ?? {};
  const shown = (field: string, value: unknown) => display(value, field, row.value_labels);
  const changes: FieldChange[] = [];

  for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (HIDDEN_FIELDS.has(field)) continue;
    const inOld = Object.hasOwn(before, field);
    const inNew = Object.hasOwn(after, field);
    const base = { field, label: label(field) };
    if (inOld && inNew) {
      if (!same(before[field], after[field])) {
        changes.push({ ...base, kind: "changed", old: shown(field, before[field]), new: shown(field, after[field]) });
      }
    } else if (inNew) {
      changes.push({ ...base, kind: "added", new: shown(field, after[field]) });
    } else {
      changes.push({ ...base, kind: "removed", old: shown(field, before[field]) });
    }
  }
  return changes;
}

// One line for the table: "Status: open → assigned", "3 fields changed: a, b, c", "Created".
export function summary(row: EntryValues & Pick<AuditLogOut, "action">): string {
  const changes = changedFields(row);
  if (changes.length === 0) return "No field changes";
  if (row.action === "create") return `Created (${changes.length} fields)`;
  if (row.action === "delete") return `Deleted (${changes.length} fields)`;
  if (changes.length === 1) {
    const [change] = changes;
    const old = change.kind === "added" ? "—" : change.old;
    const next = change.kind === "removed" ? "—" : change.new;
    return `${change.label}: ${old} → ${next}`;
  }
  return `${changes.length} fields changed: ${changes.map((c) => c.label.toLowerCase()).join(", ")}`;
}
