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

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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

async function errorFromResponse(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`;
  try {
    const body = await response.json();
    if (typeof body.detail === "string") message = body.detail;
  } catch {
    // Body was not JSON; keep the generic message.
  }
  return new ApiError(response.status, message);
}

// Authenticated request. Any 401 clears the token and triggers the logout handler.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    clearToken();
    onUnauthorized();
  }
  if (!response.ok) throw await errorFromResponse(response);
  return response.json();
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
