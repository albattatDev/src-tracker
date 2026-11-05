import { useEffect, useState, type ComponentType } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useButtonSize } from "../../hooks/useButtonSize";
import { DASHBOARD_KEY } from "../../hooks/useDashboard";
import { formatRiyadhLongDate } from "../../utils/dates";
import { dashboardActionFor, type DashboardAction } from "../../utils/permissions";
import AddUserButton from "./AddUserButton";
import { buttonClass } from "../buttonStyles";
import NewRequestLink from "./NewRequestLink";

const ACTIONS: Record<DashboardAction, ComponentType> = {
  "new-request": NewRequestLink,
  "add-user": AddUserButton,
};

function ago(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}

// "Updated just now", from when the cards' own query last got data. Re-renders every 30s so the
// words stay true.
function UpdatedAt({ updatedAt, fetching }: { updatedAt: number; fetching: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (updatedAt === 0) return null;
  return (
    <span className="whitespace-nowrap text-sm text-muted">
      {fetching ? "Updating…" : `Updated ${ago(updatedAt)}`}
    </span>
  );
}

// Title, today's date (Riyadh), when the numbers were loaded, Refresh, and the role's main
// action (New request, Add user: see dashboardActionFor). Refresh refetches every dashboard
// query; while it runs the button is disabled and says "Refreshing…". On mobile the action is
// a full-width row below. `updatedAt` is the dataUpdatedAt of the query that drives the cards.
export default function DashboardHeader({ updatedAt }: { updatedAt: number }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fetching = useIsFetching({ queryKey: DASHBOARD_KEY }) > 0;
  const mobile = useBreakpoint() === "mobile";
  const size = useButtonSize();
  const actionKey = dashboardActionFor(user?.role);
  const Action = actionKey ? ACTIONS[actionKey] : null;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-2xl font-semibold">Dashboard</span>
          <span className="text-sm font-normal text-muted">{formatRiyadhLongDate(new Date())}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <UpdatedAt updatedAt={updatedAt} fetching={fetching} />
          <button
            type="button"
            disabled={fetching}
            onClick={() => queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })}
            className={buttonClass("secondary", size)}
          >
            <RefreshCw
              size={16}
              strokeWidth={2}
              aria-hidden="true"
              className={fetching ? "animate-spin motion-reduce:animate-none" : ""}
            />
            {fetching ? "Refreshing…" : "Refresh"}
          </button>
          {!mobile && Action && <Action />}
        </div>
      </div>
      {mobile && Action && (
        <div className="mt-4">
          <Action />
        </div>
      )}
    </div>
  );
}
