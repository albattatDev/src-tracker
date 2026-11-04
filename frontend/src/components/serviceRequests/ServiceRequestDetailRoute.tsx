import { useBreakpoint } from "../../hooks/useBreakpoint";
import ServiceRequestDetailScreen from "./ServiceRequestDetailScreen";
import ServiceRequestPanel from "./ServiceRequestPanel";
import ServiceRequestSlideOver from "./ServiceRequestSlideOver";

// The element of /service-requests/:id. Exactly one of the three renders, never several.
export default function ServiceRequestDetailRoute() {
  switch (useBreakpoint()) {
    case "desktop":
      return <ServiceRequestPanel />;
    case "tablet":
      return <ServiceRequestSlideOver />;
    case "mobile":
      return <ServiceRequestDetailScreen />;
  }
}
