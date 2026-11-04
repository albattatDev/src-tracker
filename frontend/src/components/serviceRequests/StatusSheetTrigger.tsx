import { useState } from "react";
import type { SRRead } from "../../api/serviceRequests";
import { useStatusChange } from "../../hooks/useStatusChange";
import { StatusBadge } from "../Badges";
import BottomSheet from "../BottomSheet";
import StatusOptionList from "./StatusOptionList";
import StatusTrigger from "./StatusTrigger";

// Mobile status control: the shared trigger (pill with the chevron inside, 44px target) that
// opens a "Move to" sheet. Same hook and list as the desktop popover.
export default function StatusSheetTrigger({ sr }: { sr: SRRead }) {
  const change = useStatusChange(sr);
  const [open, setOpen] = useState(false);

  if (!change.canChange) return <StatusBadge status={sr.status} />;

  return (
    <>
      <StatusTrigger status={sr.status} onClick={() => setOpen(true)} aria-haspopup="dialog" />
      {open && (
        <BottomSheet title="Move to" onClose={() => setOpen(false)}>
          <StatusOptionList
            options={change.options}
            size="touch"
            onPick={(status) => {
              setOpen(false);
              change.change(status);
            }}
          />
        </BottomSheet>
      )}
    </>
  );
}
