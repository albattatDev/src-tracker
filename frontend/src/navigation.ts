import type { Role } from "./api/client";

export interface NavItem {
  path: string;
  label: string;
  roles: Role[];
}

// Single source for the sidebar and the route guards, so they cannot disagree.
export const NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    roles: ["operations", "engineer", "manager", "admin"],
  },
  {
    path: "/service-requests",
    label: "Service Requests",
    roles: ["operations", "engineer", "manager", "admin"],
  },
  { path: "/invoices", label: "Invoices", roles: ["engineer", "manager", "admin"] },
  { path: "/contractors", label: "Contractors", roles: ["manager", "admin"] },
  { path: "/audit-log", label: "Audit Log", roles: ["manager", "admin"] },
  { path: "/users", label: "Users", roles: ["admin"] },
];

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
