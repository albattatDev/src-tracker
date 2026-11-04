import { useMatch } from "react-router-dom";

export interface SrRoute {
  kind: "list" | "new" | "detail";
  // The request id of a detail route; undefined when it is not a whole positive number.
  id: number | undefined;
}

// Which part of the service requests area the URL is on. The route patterns live here and in
// App.tsx. "new" also matches :id, so it is told apart first.
export function useSrRoute(): SrRoute {
  const isNew = useMatch("/service-requests/new") !== null;
  const detail = useMatch("/service-requests/:id");

  if (isNew) return { kind: "new", id: undefined };
  if (!detail) return { kind: "list", id: undefined };
  const id = Number(detail.params.id);
  return { kind: "detail", id: Number.isInteger(id) && id > 0 ? id : undefined };
}
