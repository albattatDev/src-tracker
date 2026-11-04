import { forwardRef, type ButtonHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import type { SRStatus } from "../../api/serviceRequests";
import { STATUS_DISPLAY, statusPillClass } from "../Badges";

// The button that opens the status menu (desktop popover) or sheet (mobile). One control: the
// pill holds the label and the chevron. The button is 44px tall, the pill inside keeps its
// normal height, so the touch target is large without a tall pill.
const StatusTrigger = forwardRef<
  HTMLButtonElement,
  { status: SRStatus } & ButtonHTMLAttributes<HTMLButtonElement>
>(function StatusTrigger({ status, className = "", ...rest }, ref) {
  const label = STATUS_DISPLAY[status].label;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Change status, currently ${label}`}
      {...rest}
      className={`group inline-flex min-h-11 items-center ${className}`}
    >
      <span className={`${statusPillClass(status, true)} group-hover:brightness-95`}>
        {label}
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
      </span>
    </button>
  );
});

export default StatusTrigger;
