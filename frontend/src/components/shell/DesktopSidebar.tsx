import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { APP_NAME } from "../../navigation";
import { buttonClass } from "../buttonStyles";
import SidebarNav from "./SidebarNav";
import { useRailExpanded } from "./useRailExpanded";

// A 64px rail that opens as an overlay on hover or keyboard focus, or stays open when pinned.
export default function DesktopSidebar({
  pinned,
  onTogglePin,
}: {
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const { expanded, overlay, handlers } = useRailExpanded(pinned);
  const PinIcon = pinned ? PanelLeftClose : PanelLeftOpen;

  return (
    <aside
      {...handlers}
      // z-30 must stay above popovers and menus that later phases add inside the page
      // (z-20 and below), because the open sidebar overlays them.
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-150 motion-reduce:transition-none md:flex ${
        expanded ? "w-sidebar" : "w-rail"
      } ${overlay ? "shadow-popover" : ""}`}
    >
      <div className="flex h-topbar shrink-0 items-center gap-3 border-b border-line px-3">
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={pinned}
          aria-label="Keep sidebar open"
          className={buttonClass("ghost", "icon")}
        >
          <PinIcon size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        {expanded && <span className="text-lg font-semibold whitespace-nowrap">{APP_NAME}</span>}
      </div>
      <SidebarNav expanded={expanded} />
    </aside>
  );
}
