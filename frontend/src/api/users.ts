import { apiFetch, sendJson } from "./client";

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

export const USER_ROLES = ["operations", "engineer", "manager", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Mirrors the backend UserAdminOut (admin Users page). There is no password field.
export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: UserRole;
  manager_id: number | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInput {
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  manager_id: number | null;
  password: string;
}

// A role is fixed at creation, so it is not part of an update.
export interface UserPatch {
  first_name?: string;
  last_name?: string;
  manager_id?: number | null;
  is_active?: boolean;
}

// Admin only. Without ?role= the API returns every user, active or not.
export function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>("/users");
}

export function createUser(data: UserInput): Promise<AdminUser> {
  return sendJson<AdminUser>("POST", "/users", data);
}

export function updateUser(id: number, data: UserPatch): Promise<AdminUser> {
  return sendJson<AdminUser>("PATCH", `/users/${id}`, data);
}
