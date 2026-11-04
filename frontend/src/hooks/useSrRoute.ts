import { useMatch } from "react-router-dom";
import { SR_BASE } from "../routes";
import { useDetailRoute } from "./useDetailRoute";

export interface SrRoute {
  kind: "list" | "new" | "detail";
  // The request id of a detail route; undefined when it is not a whole positive number.
  id: number | undefined;
}

// Which part of the service requests area the URL is on: useDetailRoute plus the fixed "new"
// route, which also matches :id and so is told apart first.
export function useSrRoute(): SrRoute {
  const isNew = useMatch(`${SR_BASE}/new`) !== null;
  const { detailOpen, detailId } = useDetailRoute(SR_BASE);

  if (isNew) return { kind: "new", id: undefined };
  return { kind: detailOpen ? "detail" : "list", id: detailId ?? undefined };
}
