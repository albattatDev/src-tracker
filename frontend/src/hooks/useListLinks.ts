import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Links between a list (`basePath`, e.g. INVOICES_BASE) and what opens over it. They carry the
// current query string, so opening and closing a panel (or going back on mobile) keeps the
// list's filters, sort and page. `close` goes back to the list the same way.
export function useListLinks(basePath: string) {
  const { search } = useLocation();
  const navigate = useNavigate();
  const listPath = `${basePath}${search}`;
  const close = useCallback(() => navigate(listPath), [navigate, listPath]);
  return {
    listPath,
    detailPath: (id: number) => `${basePath}/${id}${search}`,
    // A fixed child route such as "new": /service-requests/new
    subPath: (segment: string) => `${basePath}/${segment}${search}`,
    close,
  };
}
