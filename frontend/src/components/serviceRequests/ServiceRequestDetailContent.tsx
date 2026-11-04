import AssignControl from "./AssignControl";
import ServiceRequestLoader from "./ServiceRequestLoader";
import SrDetailBody from "./SrDetailBody";
import StatusControl from "./StatusControl";

// What the inline panel and the slide-over show: the request with the popover controls.
// The two are separate wrappers around this; the mobile screen has its own sheet controls.
export default function ServiceRequestDetailContent({ id }: { id: number }) {
  return (
    <div className="p-4">
      <ServiceRequestLoader id={id}>
        {(sr) => (
          <SrDetailBody
            key={sr.id}
            sr={sr}
            status={<StatusControl sr={sr} />}
            engineer={<AssignControl sr={sr} />}
          />
        )}
      </ServiceRequestLoader>
    </div>
  );
}
