import { apiFetch } from "./client";
import type { AgingBand } from "./invoices";
import type { SRStatus } from "./serviceRequests";

// Mirrors schemas/dashboard.py (DashboardOut).
export interface DocumentCounts {
  expiring_soon: number;
  expired: number;
}

export interface DashboardOut {
  sr_by_status: Record<SRStatus, number>; // all five statuses, 0 when none
  invoices_by_band: Record<AgingBand, number> | null; // pending invoices; null for operations
  documents: DocumentCounts | null; // null unless manager or admin
}

export function getDashboard(): Promise<DashboardOut> {
  return apiFetch<DashboardOut>("/dashboard");
}
