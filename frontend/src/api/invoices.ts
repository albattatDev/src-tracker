import { apiFetch, sendJson } from "./client";
import type { SortOrder } from "./serviceRequests";

// These mirror the backend enums and schemas (InvoiceOut, InvoicePage, InvoiceListParams).
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// What a manager can do with a pending invoice. Also names the ConfirmDialog tone.
export type Decision = "approve" | "reject";

export const AGING_BANDS = ["green", "yellow", "orange", "red"] as const;
export type AgingBand = (typeof AGING_BANDS)[number];

export interface InvoiceOut {
  id: number;
  service_request_id: number;
  service_request_title: string;
  assigned_engineer_name: string | null;
  invoice_number: string;
  amount: string; // decimal string such as "1250.50": never parse it into a float
  submission_date: string; // YYYY-MM-DD
  due_date: string | null; // YYYY-MM-DD
  approval_status: ApprovalStatus;
  created_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null; // UTC, ends with Z
  created_at: string;
  updated_at: string;
  // Sent for every invoice; the UI decides whether to show them (not for approved ones).
  age_days: number;
  aging_band: AgingBand;
}

export interface InvoicePage {
  items: InvoiceOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface InvoiceListParams {
  approval_status?: ApprovalStatus;
  aging_band?: AgingBand;
  service_request_id?: number;
  q?: string;
  sort?: "created_at" | "amount" | "age";
  order?: SortOrder;
  page?: number;
  page_size?: number;
}

export interface InvoiceCreate {
  service_request_id: number;
  invoice_number: string;
  amount: string;
  submission_date: string;
  due_date?: string | null;
}

export function listInvoices(params: InvoiceListParams): Promise<InvoicePage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return apiFetch<InvoicePage>(`/invoices${qs ? `?${qs}` : ""}`);
}

export function createInvoice(data: InvoiceCreate): Promise<InvoiceOut> {
  return sendJson<InvoiceOut>("POST", "/invoices", data);
}

export function approveInvoice(id: number): Promise<InvoiceOut> {
  return sendJson<InvoiceOut>("POST", `/invoices/${id}/approve`);
}

export function rejectInvoice(id: number): Promise<InvoiceOut> {
  return sendJson<InvoiceOut>("POST", `/invoices/${id}/reject`);
}
