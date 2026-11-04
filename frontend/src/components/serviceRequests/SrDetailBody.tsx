import type { SRRead } from "../../api/serviceRequests";
import { formatRiyadh } from "../../utils/dates";
import { PersonName } from "../Avatar";
import { PriorityBadge } from "../Badges";
import PropertyRow from "../PropertyRow";
import AssignControl from "./AssignControl";
import AssignSheetTrigger from "./AssignSheetTrigger";
import LinkedInvoices from "./LinkedInvoices";
import StatusControl from "./StatusControl";
import StatusSheetTrigger from "./StatusSheetTrigger";

// Everything the panel, the slide-over and the mobile screen show about a request. Only the two
// interactive rows differ: popover controls on desktop and tablet, sheet triggers on mobile.
export default function SrDetailBody({ sr, mobile }: { sr: SRRead; mobile: boolean }) {
  return (
    <>
      <h2 className="text-lg font-semibold">{sr.title}</h2>

      <dl className="mt-4">
        <PropertyRow label="Status">
          {mobile ? <StatusSheetTrigger sr={sr} /> : <StatusControl sr={sr} />}
        </PropertyRow>
        <PropertyRow label="Priority">
          <PriorityBadge priority={sr.priority} />
        </PropertyRow>
        <PropertyRow label="Engineer">
          {mobile ? <AssignSheetTrigger sr={sr} /> : <AssignControl sr={sr} />}
        </PropertyRow>
        <PropertyRow label="Requester">
          <PersonName name={sr.requester_name} />
        </PropertyRow>
        <PropertyRow label="Created">{formatRiyadh(sr.created_at)}</PropertyRow>
        <PropertyRow label="Updated">{formatRiyadh(sr.updated_at)}</PropertyRow>
      </dl>

      <section className="mt-6">
        <h3 className="text-base font-semibold">Description</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{sr.description}</p>
      </section>

      <LinkedInvoices sr={sr} />
    </>
  );
}
