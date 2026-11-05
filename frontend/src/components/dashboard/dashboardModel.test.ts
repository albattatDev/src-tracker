import { describe, expect, it } from "vitest";
import type { DashboardOut } from "../../api/dashboard";
import type { AgingBand } from "../../api/invoices";
import { AGING_DISPLAY, PRIORITY_DISPLAY, ROLE_DISPLAY, STATUS_DISPLAY } from "../Badges";
import {
  bandItems,
  hasSection,
  managerItems,
  pendingTotal,
  priorityItems,
  roleChipLabel,
  roleItems,
  statusItems,
  totalOf,
  worstBand,
} from "./dashboardModel";
import type { UsersSummary } from "./summarizeUsers";

const bands = (green: number, yellow: number, orange: number, red: number): Record<AgingBand, number> => ({
  green,
  yellow,
  orange,
  red,
});

const byStatus = { open: 1, assigned: 2, in_progress: 3, resolved: 4, closed: 5 };

function summary(overrides: Partial<DashboardOut> = {}): DashboardOut {
  return {
    sr_by_status: byStatus,
    invoices_by_band: bands(1, 0, 0, 0),
    documents: { expiring_soon: 0, expired: 0 },
    ...overrides,
  };
}

describe("pendingTotal", () => {
  it("adds all four bands, the same rows /invoices?status=pending lists", () => {
    expect(pendingTotal(bands(1, 2, 3, 4))).toBe(10);
    expect(pendingTotal(bands(0, 0, 0, 0))).toBe(0);
  });
});

describe("worstBand", () => {
  it("is the worst band that has invoices", () => {
    expect(worstBand(bands(5, 4, 3, 1))).toBe("red");
    expect(worstBand(bands(5, 4, 3, 0))).toBe("orange");
    expect(worstBand(bands(5, 4, 0, 0))).toBe("yellow");
    expect(worstBand(bands(5, 0, 0, 0))).toBe("green");
  });

  it("is undefined when nothing is pending", () => {
    expect(worstBand(bands(0, 0, 0, 0))).toBeUndefined();
  });
});

describe("hasSection", () => {
  it("shows every section until the summary has loaded", () => {
    expect(hasSection(undefined, "invoices_by_band")).toBe(true);
    expect(hasSection(undefined, "documents")).toBe(true);
  });

  it("hides a section the API sent as null", () => {
    const operations = summary({ invoices_by_band: null, documents: null });
    expect(hasSection(operations, "invoices_by_band")).toBe(false);
    expect(hasSection(operations, "documents")).toBe(false);
  });

  it("shows a section that is present, even if its counts are 0", () => {
    const engineer = summary({ documents: null });
    expect(hasSection(engineer, "invoices_by_band")).toBe(true);
    expect(hasSection(engineer, "documents")).toBe(false);
    expect(hasSection(summary(), "documents")).toBe(true);
  });
});

describe("totalOf", () => {
  it("adds only the listed keys", () => {
    const withAnExtraKey = { a: 1, b: 2, c: 3 };
    expect(totalOf(withAnExtraKey, ["a", "c"])).toBe(4);
    expect(totalOf(byStatus, ["open", "assigned", "in_progress", "resolved", "closed"])).toBe(15);
  });
});

describe("statusItems", () => {
  it("has one row per status in order, each linking to the requests with that status", () => {
    const items = statusItems(byStatus);
    expect(items.map((item) => item.key)).toEqual(["open", "assigned", "in_progress", "resolved", "closed"]);
    expect(items.map((item) => item.to)).toEqual([
      "/service-requests?status=open",
      "/service-requests?status=assigned",
      "/service-requests?status=in_progress",
      "/service-requests?status=resolved",
      "/service-requests?status=closed",
    ]);
    expect(items.map((item) => item.count)).toEqual([1, 2, 3, 4, 5]);
    expect(items[2]).toMatchObject({
      label: STATUS_DISPLAY.in_progress.label,
      colors: STATUS_DISPLAY.in_progress.className,
    });
  });

  it("can be limited to some statuses (an engineer has no Open row)", () => {
    const items = statusItems(byStatus, ["assigned", "in_progress", "resolved", "closed"]);
    expect(items.map((item) => item.key)).toEqual(["assigned", "in_progress", "resolved", "closed"]);
  });
});

describe("bandItems", () => {
  it("lists Normal to Critical, each linking to the pending invoices of that band", () => {
    const items = bandItems(bands(1, 2, 3, 4));
    expect(items.map((item) => item.label)).toEqual(["Normal", "Warning", "Overdue", "Critical"]);
    expect(items.map((item) => item.count)).toEqual([1, 2, 3, 4]);
    expect(items.map((item) => item.to)).toEqual([
      "/invoices?status=pending&band=green",
      "/invoices?status=pending&band=yellow",
      "/invoices?status=pending&band=orange",
      "/invoices?status=pending&band=red",
    ]);
    expect(items[3].colors).toBe(AGING_DISPLAY.red.className);
  });
});

describe("priorityItems", () => {
  it("links each priority to the requests with that priority", () => {
    const items = priorityItems({ low: 0, medium: 2, high: 1 });
    expect(items.map((item) => item.to)).toEqual([
      "/service-requests?priority=low",
      "/service-requests?priority=medium",
      "/service-requests?priority=high",
    ]);
    expect(items[1]).toMatchObject({
      label: PRIORITY_DISPLAY.medium.label,
      count: 2,
      colors: PRIORITY_DISPLAY.medium.className,
    });
  });
});

const users: UsersSummary = {
  active: 4,
  inactive: 1,
  byRole: { operations: 1, engineer: 2, manager: 1, admin: 0 },
  engineers: 2,
  withoutManager: 1,
  perManager: [{ id: 10, name: "Sara Ali", engineers: 1 }],
};

describe("roleItems", () => {
  it("has one row per role, all going to the unfiltered Users page", () => {
    const items = roleItems(users);
    expect(items.map((item) => [item.label, item.count])).toEqual([
      ["Operations", 1],
      ["Engineer", 2],
      ["Manager", 1],
      ["Admin", 0],
    ]);
    expect(new Set(items.map((item) => item.to))).toEqual(new Set(["/users"]));
    expect(items[1].colors).toBe(ROLE_DISPLAY.engineer.className);
  });
});

describe("managerItems", () => {
  it("has a row per manager (keyed by id) and then the No manager row", () => {
    const items = managerItems(users);
    expect(items.map((item) => [item.key, item.label, item.count])).toEqual([
      ["10", "Sara Ali", 1],
      ["none", "No manager", 1],
    ]);
    expect(items[0].colors).toBe(ROLE_DISPLAY.manager.className);
    expect(items.every((item) => item.to === "/users")).toBe(true);
  });

  it("keeps the No manager row when every engineer has one", () => {
    const items = managerItems({ ...users, withoutManager: 0 });
    expect(items.at(-1)).toMatchObject({ label: "No manager", count: 0 });
  });
});

describe("roleChipLabel", () => {
  it("adds an s for more than one, except for Operations", () => {
    expect(roleChipLabel("engineer", 2)).toBe("2 Engineers");
    expect(roleChipLabel("engineer", 1)).toBe("1 Engineer");
    expect(roleChipLabel("manager", 1)).toBe("1 Manager");
    expect(roleChipLabel("admin", 3)).toBe("3 Admins");
    expect(roleChipLabel("operations", 1)).toBe("1 Operations");
    expect(roleChipLabel("operations", 4)).toBe("4 Operations");
  });
});
