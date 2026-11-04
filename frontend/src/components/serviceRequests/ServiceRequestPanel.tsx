import { useParams } from "react-router-dom";
import { useCloseToList } from "../../hooks/useCloseToList";
import SidePanel from "../SidePanel";
import ServiceRequestDetailContent from "./ServiceRequestDetailContent";
import SrBreadcrumb from "./SrBreadcrumb";

// Desktop (xl and up): the resizable panel beside the list.
export default function ServiceRequestPanel() {
  const id = Number(useParams().id);
  return (
    <SidePanel
      aria-label={`Service request #${id}`}
      defaultWidth={420}
      storageKey="srct.panelWidth.sr"
      onClose={useCloseToList()}
      breadcrumb={<SrBreadcrumb id={id} />}
    >
      <ServiceRequestDetailContent id={id} />
    </SidePanel>
  );
}
