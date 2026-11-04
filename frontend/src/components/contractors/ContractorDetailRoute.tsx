import { useParams } from "react-router-dom";
import { useContractor } from "../../hooks/useContractors";
import { useListLinks } from "../../hooks/useListLinks";
import { CONTRACTORS_BASE } from "../../routes";
import { fromQuery } from "../detail/detailStatus";
import DetailShell from "../detail/DetailShell";
import DetailState from "../detail/DetailState";
import ContractorDetailBody from "./ContractorDetailBody";

// The element of /contractors/:id. It loads the contractor and hands the shell the pieces; the
// shell picks the panel, the slide-over or the full screen. The title is the contractor's name
// once it has loaded; until then (and if it never does) the id stands in.
export default function ContractorDetailRoute() {
  const id = Number(useParams().id);
  const { listPath } = useListLinks(CONTRACTORS_BASE);
  const status = fromQuery(useContractor(id));
  const title = status.kind === "ready" ? status.data.name : `Contractor #${id}`;

  return (
    <DetailShell
      aria-label={`Contractor #${id}`}
      width={640}
      storageKey="srct.panelWidth.contractor"
      list={{ label: "Contractors", path: listPath }}
      title={title}
    >
      {({ mobile }) => (
        <DetailState status={status} notFoundText="Contractor not found">
          {(contractor) => <ContractorDetailBody key={contractor.id} contractor={contractor} mobile={mobile} />}
        </DetailState>
      )}
    </DetailShell>
  );
}
