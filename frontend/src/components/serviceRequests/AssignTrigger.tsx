import { forwardRef, type ButtonHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { PersonName } from "../Avatar";

// The button that opens the engineer search (desktop popover) or sheet (mobile). Avatar, name
// and chevron sit in one rounded box that is the hover target, so they read as one control.
// The button is 44px tall; the box inside is shorter. A long name is cut with an ellipsis
// (PersonName truncates it) while the avatar and the chevron keep their size; the full name is
// the button's title.
const AssignTrigger = forwardRef<
  HTMLButtonElement,
  { person: string | null } & ButtonHTMLAttributes<HTMLButtonElement>
>(function AssignTrigger({ person, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Engineer: ${person ?? "Unassigned"}. Change engineer`}
      title={person ?? undefined}
      {...rest}
      className={`group inline-flex min-h-11 max-w-full items-center ${className}`}
    >
      {/* font-normal: the names are regular weight, the button text inherits nothing bold. */}
      <span className="inline-flex min-w-0 items-center gap-2 rounded-button px-1.5 py-1 font-normal group-hover:bg-fill">
        <PersonName name={person} emptyLabel="Unassigned" />
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-muted" />
      </span>
    </button>
  );
});

export default AssignTrigger;
