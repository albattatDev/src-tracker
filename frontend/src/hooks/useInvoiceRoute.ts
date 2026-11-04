import { useMatch } from "react-router-dom";

export interface InvoiceRoute {
  kind: "list" | "detail";
  // The invoice id of a detail route; undefined when it is not a whole positive number.
  id: number | undefined;
}

// Which part of the invoices area the URL is on. The route patterns live here and in App.tsx.
export function useInvoiceRoute(): InvoiceRoute {
  const detail = useMatch("/invoices/:id");
  if (!detail) return { kind: "list", id: undefined };
  const id = Number(detail.params.id);
  return { kind: "detail", id: Number.isInteger(id) && id > 0 ? id : undefined };
}
