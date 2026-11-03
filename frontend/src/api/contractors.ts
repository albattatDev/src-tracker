import { apiFetch, apiFetchBlob, apiUploadWithProgress, sendJson, type UploadOptions } from "./client";

// These mirror the backend enums and schemas (schemas/contractor.py).
export const DOC_TYPES = ["HIP", "JSA", "CCSP", "CWQAP", "JOB_X"] as const;
export type DocType = (typeof DOC_TYPES)[number];

// The five fixed document rows, in display order, with their full names.
export const DOC_TYPE_NAMES: Record<DocType, string> = {
  HIP: "Health Insurance Plan",
  JSA: "Job Safety Analysis",
  CCSP: "Contractor Certificate of Safety Performance",
  CWQAP: "Contractor Work Quality Assurance Plan",
  JOB_X: "Specific Job Permit/Document",
};

export type DocumentStatus = "valid" | "expiring_soon" | "expired";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export interface DocCounts {
  valid: number;
  expiring_soon: number;
  expired: number;
}

export interface DocumentOut {
  id: number;
  contractor_id: number;
  doc_type: DocType;
  original_filename: string;
  expiry_date: string; // YYYY-MM-DD
  status: DocumentStatus;
  days_left: number; // negative once expired
  uploaded_by_name: string;
  uploaded_at: string; // UTC, ends with Z
  is_current: boolean;
}

export interface CurrentDocument extends DocumentOut {
  upload_count: number; // uploads of this type, the current one included
}

export interface Contractor {
  id: number;
  name: string;
  contact_email: string;
  internal_manager_id: number;
  internal_manager_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractorListItem extends Contractor {
  doc_counts: DocCounts;
  types_uploaded: number; // out of DOC_TYPES.length
}

export interface ContractorPage {
  items: ContractorListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ContractorDetail extends Contractor {
  current_documents: CurrentDocument[];
}

export interface ContractorListParams {
  q?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface ContractorInput {
  name: string;
  contact_email: string;
  internal_manager_id: number;
}

export type ContractorPatch = Partial<ContractorInput & { is_active: boolean }>;

export function listContractors(params: ContractorListParams): Promise<ContractorPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return apiFetch<ContractorPage>(`/contractors${qs ? `?${qs}` : ""}`);
}

export function getContractor(id: number): Promise<ContractorDetail> {
  return apiFetch<ContractorDetail>(`/contractors/${id}`);
}

export function createContractor(data: ContractorInput): Promise<Contractor> {
  return sendJson<Contractor>("POST", "/contractors", data);
}

export function updateContractor(id: number, data: ContractorPatch): Promise<Contractor> {
  return sendJson<Contractor>("PATCH", `/contractors/${id}`, data);
}

export function listDocuments(contractorId: number, docType?: DocType): Promise<DocumentOut[]> {
  const qs = docType ? `?doc_type=${docType}` : "";
  return apiFetch<DocumentOut[]>(`/contractors/${contractorId}/documents${qs}`);
}

export interface UploadInput {
  doc_type: DocType;
  expiry_date: string;
  file: File;
}

// One multipart request with the file and its fields. `options` reports progress and lets the
// caller cancel (see apiUploadWithProgress).
export function uploadDocument(
  contractorId: number,
  data: UploadInput,
  options: UploadOptions = {}
): Promise<DocumentOut> {
  const form = new FormData();
  form.set("doc_type", data.doc_type);
  form.set("expiry_date", data.expiry_date);
  form.set("file", data.file);
  return apiUploadWithProgress<DocumentOut>(`/contractors/${contractorId}/documents`, form, options);
}

// Fetches the file with the JWT, then hands the browser a temporary link to save it.
export async function downloadDocument(documentId: number, filename: string): Promise<void> {
  const blob = await apiFetchBlob(`/documents/${documentId}/download`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
