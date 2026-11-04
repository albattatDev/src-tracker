import type { AuditLogOut } from "../api/audit";

export interface FieldChange {
  field: string;
  old?: unknown;
  new?: unknown;
}

type Values = Record<string, unknown> | null;

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Only the fields that changed. A create shows the new values, a delete the old ones; any
// other action compares the two snapshots and keeps the keys whose values differ.
export function changedFields(action: string, oldValues: Values, newValues: Values): FieldChange[] {
  if (action === "create") {
    return Object.entries(newValues ?? {}).map(([field, value]) => ({ field, new: value }));
  }
  if (action === "delete") {
    return Object.entries(oldValues ?? {}).map(([field, value]) => ({ field, old: value }));
  }
  const before = oldValues ?? {};
  const after = newValues ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .filter((key) => !same(before[key], after[key]))
    .map((field) => ({ field, old: before[field], new: after[field] }));
}

export function fieldLabel(field: string): string {
  const text = field.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// One line for the table: "Status: open → assigned", "3 fields changed: a, b, c", "Created".
export function summary(row: Pick<AuditLogOut, "action" | "old_values" | "new_values">): string {
  const changes = changedFields(row.action, row.old_values, row.new_values);
  if (changes.length === 0) return "No field changes";
  if (row.action === "create") return `Created (${changes.length} fields)`;
  if (row.action === "delete") return `Deleted (${changes.length} fields)`;
  if (changes.length === 1) {
    const [change] = changes;
    return `${fieldLabel(change.field)}: ${formatValue(change.old)} → ${formatValue(change.new)}`;
  }
  const names = changes.map((c) => fieldLabel(c.field).toLowerCase());
  return `${changes.length} fields changed: ${names.join(", ")}`;
}
