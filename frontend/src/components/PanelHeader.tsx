import type { ReactNode } from "react";
import { X } from "lucide-react";
import { buttonClass } from "./buttonStyles";

// The top row of SidePanel and SlideOver: a breadcrumb slot and the close button. Sticky, so
// it stays in view while the content below scrolls.
export default function PanelHeader({
  breadcrumb,
  onClose,
}: {
  breadcrumb: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex h-topbar shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-4">
      <div className="min-w-0 truncate">{breadcrumb}</div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className={`${buttonClass("ghost", "icon")} -mr-2`}
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
