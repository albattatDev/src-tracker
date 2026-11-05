import { describe, expect, it } from "vitest";
import type { QueryLike } from "../../hooks/useDashboardLists";
import { queryView } from "./QueryState";

function query(overrides: Partial<QueryLike<number>>): QueryLike<number> {
  return { data: undefined, isPending: false, isError: false, error: null, refetch: () => undefined, ...overrides };
}

describe("queryView", () => {
  it("is loading while pending, and while there is no data yet", () => {
    expect(queryView(query({ isPending: true })).kind).toBe("loading");
    expect(queryView(query({})).kind).toBe("loading");
  });

  it("is an error with the message, or a default when there is none", () => {
    expect(queryView(query({ isError: true, error: new Error("Down") }))).toEqual({ kind: "error", message: "Down" });
    expect(queryView(query({ isError: true }))).toEqual({ kind: "error", message: "Could not load." });
  });

  it("is ready with the data, even when the data is 0", () => {
    expect(queryView(query({ data: 0 }))).toEqual({ kind: "ready", data: 0 });
  });
});
