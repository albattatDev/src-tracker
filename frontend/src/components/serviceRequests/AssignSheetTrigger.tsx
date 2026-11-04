import { useState } from "react";
import type { SRRead } from "../../api/serviceRequests";
import { useAssignEngineer } from "../../hooks/useAssignEngineer";
import { PersonName } from "../Avatar";
import BottomSheet from "../BottomSheet";
import AssignTrigger from "./AssignTrigger";
import EngineerPicker from "./EngineerPicker";

// Mobile assign control: the shared trigger (avatar, name and chevron as one 44px control) that
// opens an "Assign engineer" sheet. Same hook and picker as the desktop popover.
export default function AssignSheetTrigger({ sr }: { sr: SRRead }) {
  const assign = useAssignEngineer(sr);
  const [open, setOpen] = useState(false);

  if (!assign.canAssign) {
    return <PersonName name={sr.assigned_engineer_name} emptyLabel="Unassigned" />;
  }

  return (
    <>
      <AssignTrigger
        person={sr.assigned_engineer_name}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      />
      {open && (
        <BottomSheet title="Assign engineer" onClose={() => setOpen(false)}>
          <EngineerPicker
            assign={assign}
            size="touch"
            onPick={(engineer) => {
              setOpen(false);
              assign.assign(engineer);
            }}
          />
        </BottomSheet>
      )}
    </>
  );
}
