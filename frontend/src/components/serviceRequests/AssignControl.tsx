import type { SRRead } from "../../api/serviceRequests";
import { useAssignEngineer } from "../../hooks/useAssignEngineer";
import { PersonName } from "../Avatar";
import Popover from "../Popover";
import AssignTrigger from "./AssignTrigger";
import EngineerPicker from "./EngineerPicker";

// Desktop and tablet assign control, used in a table row, the panel and the slide-over. Plain
// person (or "Unassigned") unless this user may assign; otherwise the shared trigger opens the
// engineer search. `relative z-10` keeps it clickable above the row's stretched link.
export default function AssignControl({ sr }: { sr: SRRead }) {
  const assign = useAssignEngineer(sr);

  if (!assign.canAssign) {
    return <PersonName name={sr.assigned_engineer_name} emptyLabel="Unassigned" />;
  }

  return (
    <Popover
      haspopup="dialog"
      renderTrigger={(props) => (
        <AssignTrigger person={sr.assigned_engineer_name} className="relative z-10" {...props} />
      )}
    >
      {(close) => (
        <div className="w-72 p-1">
          <EngineerPicker
            assign={assign}
            size="md"
            onPick={(engineer) => {
              close();
              assign.assign(engineer);
            }}
          />
        </div>
      )}
    </Popover>
  );
}
