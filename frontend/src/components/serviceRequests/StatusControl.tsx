import type { SRRead } from "../../api/serviceRequests";
import { useStatusChange } from "../../hooks/useStatusChange";
import { StatusBadge } from "../Badges";
import Popover from "../Popover";
import StatusOptionList from "./StatusOptionList";
import StatusTrigger from "./StatusTrigger";

// Desktop and tablet status control, used in a table row, the panel and the slide-over. A plain
// badge when this user may not change the status; otherwise the shared trigger opens "Move to".
// `relative z-10` keeps it clickable above the row's stretched link.
export default function StatusControl({ sr }: { sr: SRRead }) {
  const change = useStatusChange(sr);
  if (!change.canChange) return <StatusBadge status={sr.status} />;

  return (
    <Popover
      haspopup="menu"
      renderTrigger={(props) => <StatusTrigger status={sr.status} className="relative z-10" {...props} />}
    >
      {(close) => (
        <>
          <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted">Move to</p>
          <StatusOptionList
            options={change.options}
            size="md"
            onPick={(status) => {
              close();
              change.change(status);
            }}
          />
        </>
      )}
    </Popover>
  );
}
