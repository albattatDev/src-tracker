import { useLocation } from "react-router-dom";

// Links between the list and one request. They carry the current query string, so opening
// and closing the panel (or going back on mobile) keeps the list's filters, sort and page.
export function useSrListLinks() {
  const { search } = useLocation();
  return {
    listPath: `/service-requests${search}`,
    newPath: `/service-requests/new${search}`,
    detailPath: (id: number) => `/service-requests/${id}${search}`,
  };
}
