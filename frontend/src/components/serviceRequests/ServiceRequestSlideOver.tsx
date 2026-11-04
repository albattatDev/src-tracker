import { useParams } from "react-router-dom";
import { useCloseToList } from "../../hooks/useCloseToList";
import SlideOver from "../SlideOver";
import ServiceRequestDetailContent from "./ServiceRequestDetailContent";
import SrBreadcrumb from "./SrBreadcrumb";

// Tablet (md up to xl): the same content as the panel, as a drawer over the list.
export default function ServiceRequestSlideOver() {
  const id = Number(useParams().id);
  return (
    <SlideOver
      aria-label={`Service request #${id}`}
      width={420}
      onClose={useCloseToList()}
      breadcrumb={<SrBreadcrumb id={id} />}
    >
      <ServiceRequestDetailContent id={id} />
    </SlideOver>
  );
}
