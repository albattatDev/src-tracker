import { Check } from "lucide-react";
import type { SRStatus } from "../../api/serviceRequests";
import type { StatusOption } from "../../hooks/useStatusChange";
import { StatusBadge } from "../Badges";

// Literal strings so Tailwind sees them: md 36px rows in a popover, touch 44px rows in a sheet.
const ROW = { md: "min-h-9", touch: "min-h-11" } as const;

// The "Move to" list: every status, the current one checked, the allowed next one enabled and
// the rest disabled. Shared by the desktop popover and the mobile sheet.
export default function StatusOptionList({
  options,
  size,
  onPick,
}: {
  options: StatusOption[];
  size: keyof typeof ROW;
  onPick: (status: SRStatus) => void;
}) {
  return (
    <div role="menu" aria-label="Move to" className="flex flex-col">
      {options.map(({ status, state }) => (
        <button
          key={status}
          type="button"
          role="menuitemradio"
          aria-checked={state === "current"}
          disabled={state === "disabled"}
          onClick={() => onPick(status)}
          className={`flex w-full items-center gap-2 rounded-field px-2 text-left hover:bg-fill disabled:opacity-45 disabled:hover:bg-transparent ${ROW[size]}`}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {state === "current" && <Check size={16} strokeWidth={2} aria-hidden="true" />}
          </span>
          <StatusBadge status={status} />
        </button>
      ))}
    </div>
  );
}
