import { afterEach, describe, expect, it } from "vitest";
import { AUDIT_LOG_KEY, AUDIT_USERS_KEY } from "./hooks/useAuditLog";
import { DASHBOARD_KEY } from "./hooks/useDashboard";
import { queryClient } from "./queryClient";

const DASHBOARD_QUERY = [...DASHBOARD_KEY, "invoices-pending"];
const AUDIT_LIST_QUERY = [...AUDIT_LOG_KEY, { page: 1 }];
const UNRELATED_QUERY = ["contractors", "list"];

function seed() {
  for (const key of [DASHBOARD_QUERY, AUDIT_LIST_QUERY, AUDIT_USERS_KEY, UNRELATED_QUERY]) {
    queryClient.setQueryData(key, "cached");
  }
}

function isStale(key: readonly unknown[]) {
  return queryClient.getQueryState(key)?.isInvalidated === true;
}

// Runs a mutation through the app's QueryClient, as any write hook would.
async function runMutation(fails: boolean) {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: async () => {
      if (fails) throw new Error("failed");
      return "ok";
    },
  });
  await mutation.execute(undefined).catch(() => undefined);
}

describe("the app QueryClient after a write", () => {
  afterEach(() => queryClient.clear());

  it("marks the dashboard and both audit-log keys stale, and nothing else", async () => {
    seed();
    await runMutation(false);
    expect(isStale(DASHBOARD_QUERY)).toBe(true);
    expect(isStale(AUDIT_LIST_QUERY)).toBe(true);
    expect(isStale(AUDIT_USERS_KEY)).toBe(true);
    expect(isStale(UNRELATED_QUERY)).toBe(false);
  });

  it("does the same when the write fails (an upload can reach the server anyway)", async () => {
    seed();
    await runMutation(true);
    expect(isStale(DASHBOARD_QUERY)).toBe(true);
    expect(isStale(AUDIT_LIST_QUERY)).toBe(true);
    expect(isStale(AUDIT_USERS_KEY)).toBe(true);
  });
});
