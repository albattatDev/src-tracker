import type { DashboardOut } from "../../api/dashboard";
import { AGING_BANDS, type AgingBand } from "../../api/invoices";
import { PRIORITIES, SR_STATUSES, type Priority, type SRStatus } from "../../api/serviceRequests";
import { USER_ROLES, type UserRole } from "../../api/users";
import { INVOICES_BASE, SR_BASE, USERS_BASE } from "../../routes";
import { AGING_DISPLAY, PRIORITY_DISPLAY, ROLE_DISPLAY, STATUS_DISPLAY } from "../Badges";
import type { OverviewItem } from "./OverviewCard";
import type { UsersSummary } from "./summarizeUsers";

// What the role layouts show, as plain data: the overview rows (label, count, colours from
// Badges.tsx, and the page with that filter applied), totals and which sections exist.

function sum(numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}

// The total of the listed keys of a count record ("2 total" over the five statuses). Naming the
// keys keeps a record that grows an extra key from changing the number.
export function totalOf<K extends string>(counts: Record<K, number>, keys: readonly K[]): number {
  return sum(keys.map((key) => counts[key]));
}

// Worst first: the order cards and chips list the bands in.
export const WORST_FIRST: AgingBand[] = [...AGING_BANDS].reverse();

export function bandLink(band: AgingBand): string {
  return `${INVOICES_BASE}?status=pending&band=${band}`;
}

export function pendingTotal(bands: Record<AgingBand, number>): number {
  return sum(AGING_BANDS.map((band) => bands[band]));
}

export function worstBand(bands: Record<AgingBand, number>): AgingBand | undefined {
  return WORST_FIRST.find((band) => bands[band] > 0);
}

// A section the API sends as null is not shown (operations has no invoices or documents, an
// engineer no documents). While the summary is still loading nothing is hidden.
export function hasSection(
  summary: DashboardOut | undefined,
  section: "invoices_by_band" | "documents"
): boolean {
  return summary === undefined || summary[section] !== null;
}

export function statusItems(
  byStatus: Record<SRStatus, number>,
  statuses: readonly SRStatus[] = SR_STATUSES
): OverviewItem[] {
  return statuses.map((status) => ({
    key: status,
    label: STATUS_DISPLAY[status].label,
    count: byStatus[status],
    colors: STATUS_DISPLAY[status].className,
    to: `${SR_BASE}?status=${status}`,
  }));
}

export function bandItems(bands: Record<AgingBand, number>): OverviewItem[] {
  return AGING_BANDS.map((band) => ({
    key: band,
    label: AGING_DISPLAY[band].label,
    count: bands[band],
    colors: AGING_DISPLAY[band].className,
    to: bandLink(band),
  }));
}

export function priorityItems(counts: Record<Priority, number>): OverviewItem[] {
  return PRIORITIES.map((priority) => ({
    key: priority,
    label: PRIORITY_DISPLAY[priority].label,
    count: counts[priority],
    colors: PRIORITY_DISPLAY[priority].className,
    to: `${SR_BASE}?priority=${priority}`,
  }));
}

// The Users page has no filters, so every users row goes to the unfiltered page.
export function roleItems(users: UsersSummary): OverviewItem[] {
  return USER_ROLES.map((role) => ({
    key: role,
    label: ROLE_DISPLAY[role].label,
    count: users.byRole[role],
    colors: ROLE_DISPLAY[role].className,
    to: USERS_BASE,
  }));
}

// One row per manager, then "No manager" (always there; it is the one that needs attention).
export function managerItems(users: UsersSummary): OverviewItem[] {
  return [
    ...users.perManager.map((group) => ({
      key: String(group.id),
      label: group.name,
      count: group.engineers,
      colors: ROLE_DISPLAY.manager.className,
      to: USERS_BASE,
    })),
    {
      key: "none",
      label: "No manager",
      count: users.withoutManager,
      colors: AGING_DISPLAY.orange.className,
      to: USERS_BASE,
    },
  ];
}

// "2 Engineers", "1 Manager". Operations is already a plural word, so it never gets an "s".
export function roleChipLabel(role: UserRole, count: number): string {
  const plural = count > 1 && role !== "operations" ? "s" : "";
  return `${count} ${ROLE_DISPLAY[role].label}${plural}`;
}
