import { Check, Play } from "lucide-react";
import type { SRRead, SRStatus } from "../../api/serviceRequests";
import { useStatusChange } from "../../hooks/useStatusChange";
import { STATUS_DISPLAY } from "../Badges";
import { buttonClass } from "../buttonStyles";
import type { ListLayout } from "./listLayout";

const STATUS_ACTION: Partial<Record<SRStatus, { label: string; icon: typeof Check }>> = {
  in_progress: { label: "Start", icon: Play },
  resolved: { label: "Mark resolved", icon: Check },
};

// The one move this user may make on a request, as a button ("Start", "Mark resolved"). The
// rule comes from useStatusChange (the same hook as the list's status control); nothing is
// shown when there is no move. While it saves, the button is disabled and says so.
export default function StatusAction({ sr, layout }: { sr: SRRead; layout: ListLayout }) {
  const change = useStatusChange(sr);
  const target = change.options.find((option) => option.state === "allowed")?.status;
  if (!change.canChange || !target) return null;

  const action = STATUS_ACTION[target] ?? { label: `Move to ${STATUS_DISPLAY[target].label}`, icon: Check };
  const Icon = action.icon;
  return (
    <button
      type="button"
      disabled={change.isPending}
      onClick={() => change.change(target)}
      className={`${buttonClass("secondary", layout === "cards" ? "touch" : "md")} ${
        layout === "cards" ? "w-full" : ""
      }`}
    >
      {change.isPending ? (
        "Saving…"
      ) : (
        <>
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
          {action.label}
        </>
      )}
    </button>
  );
}
