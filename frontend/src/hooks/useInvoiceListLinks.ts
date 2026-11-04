import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Links between the invoice list and one invoice. They carry the current query string, so
// opening and closing the panel (or going back on mobile) keeps the filters and the page.
export function useInvoiceListLinks() {
  const { search } = useLocation();
  return {
    listPath: `/invoices${search}`,
    detailPath: (id: number) => `/invoices/${id}${search}`,
  };
}

// Closes the panel, slide-over or screen by going back to the list with the same filters.
export function useCloseInvoice() {
  const navigate = useNavigate();
  const { listPath } = useInvoiceListLinks();
  return useCallback(() => navigate(listPath), [navigate, listPath]);
}
