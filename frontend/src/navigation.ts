import {
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { matchPath } from "react-router-dom";
import type { Role } from "./api/client";
import { AUDIT_BASE, CONTRACTORS_BASE, INVOICES_BASE, SR_BASE } from "./routes";
import {
  VIEW_AUDIT_ROLES,
  VIEW_CONTRACTORS_ROLES,
  VIEW_INVOICES_ROLES,
  VIEW_USERS_ROLES,
} from "./utils/permissions";

export const APP_NAME = "SRC-T";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

// Single source for the sidebar and the route guards, so they cannot disagree.
export const NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["operations", "engineer", "manager", "admin"],
  },
  {
    path: SR_BASE,
    label: "Service Requests",
    icon: ClipboardList,
    roles: ["operations", "engineer", "manager", "admin"],
  },
  { path: INVOICES_BASE, label: "Invoices", icon: Receipt, roles: VIEW_INVOICES_ROLES },
  { path: CONTRACTORS_BASE, label: "Contractors", icon: Building2, roles: VIEW_CONTRACTORS_ROLES },
  { path: AUDIT_BASE, label: "Audit Log", icon: History, roles: VIEW_AUDIT_ROLES },
  { path: "/users", label: "Users", icon: Users, roles: VIEW_USERS_ROLES },
];

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

// Title for the mobile top bar. Detail and create pages use their section's title:
// a detail path such as "<base>/1" matches "<base>" (end: false matches whole path segments).
export function pageTitleFor(pathname: string): string {
  const item = NAV_ITEMS.find((candidate) => matchPath({ path: candidate.path, end: false }, pathname));
  return item?.label ?? APP_NAME;
}
