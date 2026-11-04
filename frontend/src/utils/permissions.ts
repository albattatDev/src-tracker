import type { Role } from "../api/client";

// Who may see or do what in the UI. These only decide which pages, buttons and sections to
// show; the API still enforces every rule. A role that is not listed is denied.
// The route guards (App.tsx), the sidebar (navigation.ts) and the pages all read from here, so
// a button and the page behind it cannot disagree.

type MaybeRole = Role | undefined;

function has(roles: readonly Role[], role: MaybeRole): boolean {
  return role !== undefined && roles.includes(role);
}

// Service requests
export const CREATE_REQUEST_ROLES: Role[] = ["operations", "manager"];
export const canCreateRequest = (role: MaybeRole) => has(CREATE_REQUEST_ROLES, role);

// Only these roles may filter the list by engineer (an engineer's list is always their own).
export const canFilterByEngineer = (role: MaybeRole) => has(["manager", "admin"], role);

// Invoices. Operations cannot call /invoices (403).
export const VIEW_INVOICES_ROLES: Role[] = ["engineer", "manager", "admin"];
export const canViewInvoices = (role: MaybeRole) => has(VIEW_INVOICES_ROLES, role);
export const canDecideInvoices = (role: MaybeRole) => role === "manager";

// Contractors: admins can look but not change.
export const VIEW_CONTRACTORS_ROLES: Role[] = ["manager", "admin"];
export const canWriteContractors = (role: MaybeRole) => role === "manager";
