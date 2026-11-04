import { useParams } from "react-router-dom";
import { useListLinks } from "../../hooks/useListLinks";
import { useServiceRequest } from "../../hooks/useServiceRequests";
import { SR_BASE } from "../../routes";
import { fromQuery } from "../detail/detailStatus";
import DetailShell from "../detail/DetailShell";
import DetailState from "../detail/DetailState";
import SrDetailBody from "./SrDetailBody";

// The element of /service-requests/:id. It loads the request and hands the shell the pieces;
// the shell picks the panel, the slide-over or the full screen.
export default function ServiceRequestDetailRoute() {
  const id = Number(useParams().id);
  const { listPath } = useListLinks(SR_BASE);
  const status = fromQuery(useServiceRequest(id));

  return (
    <DetailShell
      aria-label={`Service request #${id}`}
      width={420}
      storageKey="srct.panelWidth.sr"
      list={{ label: "Service Requests", path: listPath }}
      title={`Request #${id}`}
    >
      {({ mobile }) => (
        <DetailState status={status} notFoundText="Request not found">
          {(sr) => <SrDetailBody key={sr.id} sr={sr} mobile={mobile} />}
        </DetailState>
      )}
    </DetailShell>
  );
}
