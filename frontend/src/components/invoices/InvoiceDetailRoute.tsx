import { useBreakpoint } from "../../hooks/useBreakpoint";
import InvoiceDetailScreen from "./InvoiceDetailScreen";
import InvoicePanel from "./InvoicePanel";
import InvoiceSlideOver from "./InvoiceSlideOver";

// The element of /invoices/:id. Exactly one of the three renders, never several.
export default function InvoiceDetailRoute() {
  switch (useBreakpoint()) {
    case "desktop":
      return <InvoicePanel />;
    case "tablet":
      return <InvoiceSlideOver />;
    case "mobile":
      return <InvoiceDetailScreen />;
  }
}
