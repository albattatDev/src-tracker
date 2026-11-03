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
