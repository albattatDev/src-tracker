import { apiFetch } from "./client";

// Mirrors the backend UserBrief: just enough to fill a dropdown.
export interface UserBrief {
  id: number;
  full_name: string;
  email: string;
}

// Only managers and admins may call this; other roles get a 403.
export function listEngineers(): Promise<UserBrief[]> {
  return apiFetch<UserBrief[]>("/users?role=engineer");
}

// The people a contractor can be assigned to as internal manager (active managers only).
export function listManagers(): Promise<UserBrief[]> {
  return apiFetch<UserBrief[]>("/users?role=manager");
}
