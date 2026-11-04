import { apiFetch } from "./client";

// field -> { String(id): name } for the foreign-key fields of old_values and new_values.
export type ValueLabels = Record<string, Record<string, string>>;

// These mirror the backend enums AuditEntity and AuditAction (services/audit.py) exactly.
export const ENTITY_TYPES = [
  "service_request",
  "invoice",
  "contractor",
  "contractor_document",
  "user",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const AUDIT_ACTIONS = ["create", "update", "delete", "approve", "assign", "reject"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditUser {
  id: number;
  full_name: string;
}

// action and entity_type are plain strings in the response: an old row may hold a value the
// UI does not know, and it must still render.
export interface AuditLogOut {
  id: number;
  created_at: string; // UTC, ends with Z
  user: AuditUser | null;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  // The entity's name ("Eastline Maintenance"), or null when nothing names it.
  entity_label: string | null;
  value_labels: ValueLabels;
}

export interface AuditLogPage {
  items: AuditLogOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditListParams {
  entity_type?: EntityType;
  action?: AuditAction;
  user_id?: number;
  date_from?: string; // YYYY-MM-DD, Riyadh day
  date_to?: string;
  page?: number;
  page_size?: number;
}

export function listAuditLog(params: AuditListParams): Promise<AuditLogPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return apiFetch<AuditLogPage>(`/audit-log${qs ? `?${qs}` : ""}`);
}

export function listAuditUsers(): Promise<AuditUser[]> {
  return apiFetch<AuditUser[]>("/audit-log/users");
}

export function getAuditEntry(id: number): Promise<AuditLogOut> {
  return apiFetch<AuditLogOut>(`/audit-log/${id}`);
}
