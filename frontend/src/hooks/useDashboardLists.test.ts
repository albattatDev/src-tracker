import type { UseQueryResult } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SRPage, SRRead } from "../api/serviceRequests";
import { listServiceRequests } from "../api/serviceRequests";
import { OPEN_REQUEST_QUERIES, TOP_COUNT, combineOpen } from "./useDashboardLists";

vi.mock("../api/serviceRequests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/serviceRequests")>()),
  listServiceRequests: vi.fn(),
}));

function sr(id: number): SRRead {
  return {
    id,
    title: `Request ${id}`,
    description: "",
    priority: "medium",
    status: "assigned",
    requester_name: "Noura",
    assigned_engineer_name: "Fahad",
    assigned_engineer_id: 3,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  };
}

function page(ids: number[], total = ids.length): SRPage {
  return { items: ids.map(sr), total, page: 1, page_size: TOP_COUNT };
}

// Only the fields combineResults reads; a full UseQueryResult has dozens.
function loaded(data: SRPage): UseQueryResult<SRPage> {
  return { data, isPending: false, isError: false, error: null, refetch: vi.fn() } as unknown as UseQueryResult<SRPage>;
}
function pending(): UseQueryResult<SRPage> {
  return { data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() } as unknown as UseQueryResult<SRPage>;
}
function failed(message: string): UseQueryResult<SRPage> {
  return {
    data: undefined,
    isPending: false,
    isError: true,
    error: new Error(message),
    refetch: vi.fn(),
  } as unknown as UseQueryResult<SRPage>;
}

describe("combineOpen (the engineer's open requests)", () => {
  it("lists in progress first, then assigned, each in the order the API gave", () => {
    const inProgress = loaded(page([7, 9]));
    const assigned = loaded(page([1, 4])); // the API already sent these oldest first
    const result = combineOpen([inProgress, assigned]);
    expect(result.data?.items.map((r) => r.id)).toEqual([7, 9, 1, 4]);
  });

  it("keeps the top 5", () => {
    const result = combineOpen([loaded(page([1, 2, 3])), loaded(page([4, 5, 6, 7]))]);
    expect(result.data?.items.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("sums the totals of both queries, not the rows shown", () => {
    const result = combineOpen([loaded(page([1, 2, 3, 4, 5], 12)), loaded(page([6], 30))]);
    expect(result.data?.total).toBe(42);
  });

  it("has no data until both queries have loaded", () => {
    const result = combineOpen([loaded(page([1])), pending()]);
    expect(result.data).toBeUndefined();
    expect(result.isPending).toBe(true);
    expect(result.isError).toBe(false);
  });

  it("reports an error from either query", () => {
    const result = combineOpen([loaded(page([1])), failed("boom")]);
    expect(result.data).toBeUndefined();
    expect(result.isError).toBe(true);
    expect(result.error?.message).toBe("boom");
  });

  it("refetches both queries", () => {
    const a = loaded(page([1]));
    const b = loaded(page([2]));
    combineOpen([a, b]).refetch();
    expect(a.refetch).toHaveBeenCalledTimes(1);
    expect(b.refetch).toHaveBeenCalledTimes(1);
  });
});

describe("what the open-requests queries ask the API for", () => {
  beforeEach(() => {
    vi.mocked(listServiceRequests).mockReset();
    vi.mocked(listServiceRequests).mockResolvedValue(page([]));
  });

  it("asks in_progress first and assigned second", () => {
    expect(OPEN_REQUEST_QUERIES.map((query) => query.queryKey.at(-1))).toEqual(["in_progress", "assigned"]);
  });

  it("asks for each status oldest first (sort created_at, order asc), 5 rows", async () => {
    for (const query of OPEN_REQUEST_QUERIES) await query.queryFn();
    expect(listServiceRequests).toHaveBeenNthCalledWith(1, {
      status: "in_progress",
      sort: "created_at",
      order: "asc",
      page_size: 5,
    });
    expect(listServiceRequests).toHaveBeenNthCalledWith(2, {
      status: "assigned",
      sort: "created_at",
      order: "asc",
      page_size: 5,
    });
  });
});
