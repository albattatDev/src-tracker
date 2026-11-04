import { useMatch } from "react-router-dom";

export interface DetailRoute {
  // True on `${basePath}/:id`, even when the id is not a number (the detail then says "not found").
  detailOpen: boolean;
  // The id of an open detail; null when none is open or the id is not a whole positive number.
  detailId: number | null;
}

// Which part of a master-detail area the URL is on. The route pattern lives here and in App.tsx.
export function useDetailRoute(basePath: string): DetailRoute {
  const match = useMatch(`${basePath}/:id`);
  if (!match) return { detailOpen: false, detailId: null };
  const id = Number(match.params.id);
  return { detailOpen: true, detailId: Number.isInteger(id) && id > 0 ? id : null };
}
