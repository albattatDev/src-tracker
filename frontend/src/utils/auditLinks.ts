import type { Role } from "../api/client";
import type { AuditLogOut } from "../api/audit";
import { CONTRACTORS_BASE, SR_BASE } from "../routes";

export const ENTITY_LABEL: Record<string, string> = {
  service_request: "Service request",
  invoice: "Invoice",
  contractor: "Contractor",
  contractor_document: "Contractor document",
  user: "User",
};

export function entityLabel(entityType: string): string {
  return ENTITY_LABEL[entityType] ?? entityType;
}

function numberField(row: AuditLogOut, key: string): number | undefined {
  const value = (row.new_values ?? row.old_values)?.[key];
  return typeof value === "number" ? value : undefined;
}

// Where the entity can be opened, or undefined when there is no page for it. Invoices and
// documents have no page of their own, so they link to their service request / contractor.
export function entityLink(row: AuditLogOut, role: Role | undefined): string | undefined {
  switch (row.entity_type) {
    case "service_request":
      return `${SR_BASE}/${row.entity_id}`;
    case "invoice": {
      const sr = numberField(row, "service_request_id");
      return sr === undefined ? undefined : `${SR_BASE}/${sr}`;
    }
    case "contractor":
      return `${CONTRACTORS_BASE}/${row.entity_id}`;
    case "contractor_document": {
      const contractor = numberField(row, "contractor_id");
      return contractor === undefined ? undefined : `${CONTRACTORS_BASE}/${contractor}`;
    }
    case "user":
      return role === "admin" ? "/users" : undefined; // the Users page is admin only
    default:
      return undefined;
  }
}
