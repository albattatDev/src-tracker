// VITE_API_URL is injected by docker-compose from the root .env (see docker-compose.yml).
// The fallback only applies when running `npm run dev` directly on the host, outside Docker.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "srct_token";

export type Role = "operations" | "engineer" | "manager" | "admin";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
}

export class ApiError extends Error {
  status: number;
  // Only set for 422: field name -> first validation message for that field.
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized: () => void = () => {};

// AuthProvider registers this so a 401 from any request logs the user out
// without a full page reload.
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

// Turns a failed answer into an ApiError. `body` is the parsed JSON, or null when the body
// was not JSON (then the generic message stays).
function errorFromBody(status: number, body: unknown): ApiError {
  let message = `Request failed with status ${status}`;
  const fieldErrors: Record<string, string> = {};
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail)) {
    // FastAPI 422: [{ loc: ["body", "title"], msg: "..." }, ...]
    message = "Please fix the highlighted fields.";
    for (const issue of detail as ValidationIssue[]) {
      const field = String(issue.loc[issue.loc.length - 1]);
      fieldErrors[field] ??= issue.msg;
    }
  }
  return new ApiError(status, message, fieldErrors);
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Body was not JSON; keep the generic message.
  }
  return errorFromBody(response.status, body);
}

// The two things every authenticated request does, shared by fetch and the XHR upload:
// send the token, and log out on a 401.
function bearerHeader(): string | null {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
}

function logOutOnUnauthorized(): void {
  clearToken();
  onUnauthorized();
}

// Authenticated request. Any 401 clears the token and triggers the logout handler. Returns
// the raw response (already checked with response.ok) so JSON and file downloads share it.
async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const authorization = bearerHeader();
  if (authorization) headers.set("Authorization", authorization);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) logOutOnUnauthorized();
  if (!response.ok) throw await errorFromResponse(response);
  return response;
}

// A FormData body works as is: the browser sets the multipart Content-Type itself.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, init);
  return response.json();
}

// For files. The JWT travels in a header, so a plain <a href> cannot download them.
export async function apiFetchBlob(path: string): Promise<Blob> {
  const response = await authorizedFetch(path);
  return response.blob();
}

export interface UploadOptions {
  onProgress?: (percent: number) => void; // whole numbers, 0 to 100
  signal?: AbortSignal; // abort() cancels the request; the promise then rejects with AbortError
}

// POST a FormData body and report how much has been sent. fetch cannot do that, so this one
// uses XMLHttpRequest. It sends the same token and logs out on a 401 like apiFetch does, and
// it throws the same ApiError. Use it only where progress or cancelling matters.
// Note: progress reaches 100 when the last byte is sent, a moment before the server answers.
export function apiUploadWithProgress<T>(
  path: string,
  body: FormData,
  { onProgress, signal }: UploadOptions = {}
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abortError = () => new DOMException("Upload cancelled", "AbortError");
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}${path}`);
    const authorization = bearerHeader();
    if (authorization) request.setRequestHeader("Authorization", authorization);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(request.responseText);
      } catch {
        // Not JSON: a success body is then unusable, a failure keeps the generic message.
      }
      if (request.status === 401) logOutOnUnauthorized();
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve(parsed as T);
      } else {
        reject(errorFromBody(request.status, parsed));
      }
    };
    request.onerror = () =>
      reject(new ApiError(0, "Network error. Check your connection and try again."));
    request.onabort = () => reject(abortError());

    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(body);
  });
}

export function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Deliberately does not use apiFetch: a 401 here means "wrong password" and must show
// an error on the form, not log anyone out. OAuth2PasswordRequestForm expects
// form-encoded fields, with the email in `username`.
export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) throw await errorFromResponse(response);
  const data: { access_token: string } = await response.json();
  return data.access_token;
}

export function getMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}
