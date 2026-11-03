import { apiFetch, sendJson } from "./client";

// These mirror the backend enums and schemas (SRRead, SRPage, SRListParams).
export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SR_STATUSES = ["open", "assigned", "in_progress", "resolved", "closed"] as const;
export type SRStatus = (typeof SR_STATUSES)[number];

export const SORT_FIELDS = ["created_at", "priority"] as const;
export type SRSortField = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface SRRead {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: SRStatus;
  requester_name: string;
  assigned_engineer_name: string | null;
  created_at: string; // UTC, ends with Z
  updated_at: string; // UTC, ends with Z
}

export interface SRPage {
  items: SRRead[];
  total: number;
  page: number;
  page_size: number;
}

// Every field is optional: leaving one out means "no filter" / "use the default".
export interface SRListParams {
  status?: SRStatus;
  priority?: Priority;
  assigned_engineer_id?: number;
  created_from?: string; // YYYY-MM-DD, Riyadh date
  created_to?: string; // YYYY-MM-DD, Riyadh date
  sort?: SRSortField;
  order?: SortOrder;
  page?: number;
  page_size?: number;
}

export function listServiceRequests(params: SRListParams): Promise<SRPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return apiFetch<SRPage>(`/service-requests${qs ? `?${qs}` : ""}`);
}

export interface SRCreate {
  title: string;
  description: string;
  priority: Priority;
}

export function getServiceRequest(id: number): Promise<SRRead> {
  return apiFetch<SRRead>(`/service-requests/${id}`);
}

export function createServiceRequest(data: SRCreate): Promise<SRRead> {
  return sendJson<SRRead>("POST", "/service-requests", data);
}

export function assignServiceRequest(id: number, engineerId: number): Promise<SRRead> {
  return sendJson<SRRead>("PATCH", `/service-requests/${id}/assign`, {
    assigned_engineer_id: engineerId,
  });
}

export function changeServiceRequestStatus(id: number, status: SRStatus): Promise<SRRead> {
  return sendJson<SRRead>("PATCH", `/service-requests/${id}/status`, { status });
}
