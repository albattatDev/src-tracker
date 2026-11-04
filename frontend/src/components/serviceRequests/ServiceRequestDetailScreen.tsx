import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSrListLinks } from "../../hooks/useSrListLinks";
import { buttonClass } from "../buttonStyles";
import { TopBarOverride } from "../shell/TopBarContext";
import AssignSheetTrigger from "./AssignSheetTrigger";
import ServiceRequestLoader from "./ServiceRequestLoader";
import SrDetailBody from "./SrDetailBody";
import StatusSheetTrigger from "./StatusSheetTrigger";

// Mobile detail: a full screen. It replaces the app's top bar with a back arrow (to the list,
// keeping its filters) and "Request #id".
export default function ServiceRequestDetailScreen() {
  const id = Number(useParams().id);
  const { listPath } = useSrListLinks();

  return (
    <>
      <TopBarOverride>
        <Link to={listPath} aria-label="Back to list" className={buttonClass("ghost", "icon-touch")}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
        </Link>
        <span className="truncate text-base font-semibold">Request #{id}</span>
      </TopBarOverride>

      <div className="rounded-xl border border-line bg-surface p-4">
        <ServiceRequestLoader id={id}>
          {(sr) => (
            <SrDetailBody
              key={sr.id}
              sr={sr}
              status={<StatusSheetTrigger sr={sr} />}
              engineer={<AssignSheetTrigger sr={sr} />}
            />
          )}
        </ServiceRequestLoader>
      </div>
    </>
  );
}
