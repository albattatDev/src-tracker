import { describe, expect, it } from "vitest";
import type { AdminUser } from "../../api/users";
import { summarizeUsers } from "./summarizeUsers";

let nextId = 1;
function user(overrides: Partial<AdminUser> = {}): AdminUser {
  const id = nextId++;
  return {
    id,
    first_name: "First",
    last_name: `Last${id}`,
    full_name: `First Last${id}`,
    email: `u${id}@srct.local`,
    role: "engineer",
    manager_id: null,
    manager_name: null,
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeUsers", () => {
  it("counts active users by role and inactive users apart", () => {
    const summary = summarizeUsers([
      user({ role: "operations" }),
      user({ role: "manager" }),
      user({ role: "admin" }),
      user({ role: "engineer", manager_id: 2, manager_name: "M" }),
      user({ role: "engineer", is_active: false }),
    ]);
    expect(summary.active).toBe(4);
    expect(summary.inactive).toBe(1);
    expect(summary.byRole).toEqual({ operations: 1, engineer: 1, manager: 1, admin: 1 });
  });

  it("counts only active engineers without a manager, and ignores other roles", () => {
    const summary = summarizeUsers([
      user({ role: "engineer" }),
      user({ role: "engineer", is_active: false }),
      user({ role: "operations", manager_id: null }),
    ]);
    expect(summary.engineers).toBe(1);
    expect(summary.withoutManager).toBe(1);
    expect(summary.perManager).toEqual([]);
  });

  it("keeps two managers with the same name as separate groups", () => {
    const summary = summarizeUsers([
      user({ manager_id: 10, manager_name: "Sara Ali" }),
      user({ manager_id: 11, manager_name: "Sara Ali" }),
      user({ manager_id: 10, manager_name: "Sara Ali" }),
    ]);
    expect(summary.perManager).toEqual([
      { id: 10, name: "Sara Ali", engineers: 2 },
      { id: 11, name: "Sara Ali", engineers: 1 },
    ]);
    expect(summary.withoutManager).toBe(0);
  });

  it("labels a manager with no name by id", () => {
    const summary = summarizeUsers([user({ manager_id: 7, manager_name: null })]);
    expect(summary.perManager[0].name).toBe("Manager #7");
  });

  it("handles no users", () => {
    const summary = summarizeUsers([]);
    expect(summary).toMatchObject({ active: 0, inactive: 0, engineers: 0, withoutManager: 0, perManager: [] });
  });
});
