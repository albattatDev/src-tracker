import type { AdminUser, UserRole } from "../../api/users";

// The engineers one manager has. The id is the identity; the name is only the label, so two
// managers with the same name stay two groups.
export interface ManagerGroup {
  id: number;
  name: string;
  engineers: number;
}

export interface UsersSummary {
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>; // active users only
  engineers: number; // active engineers
  withoutManager: number; // active engineers with no manager
  perManager: ManagerGroup[]; // in the order each manager is first met
}

// What the admin dashboard counts, from GET /users. Inactive users cannot sign in, so they are
// only counted as inactive: they are in no other number.
export function summarizeUsers(users: AdminUser[]): UsersSummary {
  const active = users.filter((user) => user.is_active);
  const byRole: Record<UserRole, number> = { operations: 0, engineer: 0, manager: 0, admin: 0 };
  for (const user of active) byRole[user.role] += 1;

  const engineers = active.filter((user) => user.role === "engineer");
  const groups = new Map<number, ManagerGroup>();
  let withoutManager = 0;
  for (const engineer of engineers) {
    if (engineer.manager_id === null) {
      withoutManager += 1;
      continue;
    }
    const group = groups.get(engineer.manager_id) ?? {
      id: engineer.manager_id,
      name: engineer.manager_name ?? `Manager #${engineer.manager_id}`,
      engineers: 0,
    };
    group.engineers += 1;
    groups.set(engineer.manager_id, group);
  }

  return {
    active: active.length,
    inactive: users.length - active.length,
    byRole,
    engineers: engineers.length,
    withoutManager,
    perManager: [...groups.values()],
  };
}
