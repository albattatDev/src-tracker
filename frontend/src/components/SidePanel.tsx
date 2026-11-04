import { useEffect, useRef, type ReactNode } from "react";
import { useResizableWidth } from "../hooks/useResizableWidth";
import { overlayIsOpen } from "../utils/overlays";
import PanelHeader from "./PanelHeader";
import PanelResizeHandle from "./PanelResizeHandle";

// An inline panel to the right of a list. It keeps its place while the list scrolls (sticky
// under the 56px top bar), scrolls on its own, and can be dragged wider or narrower. The
// width is remembered per `storageKey`. Knows nothing about what it shows: the page passes
// the breadcrumb and the content. For narrower screens use SlideOver instead.
export default function SidePanel({
  "aria-label": ariaLabel,
  defaultWidth,
  storageKey,
  breadcrumb,
  onClose,
  footer,
  children,
}: {
  "aria-label": string;
  defaultWidth: number;
  storageKey: string;
  breadcrumb: ReactNode;
  onClose: () => void;
  footer?: ReactNode; // pinned under the scrolling content (e.g. the action buttons)
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const resize = useResizableWidth(panelRef, storageKey, defaultWidth);

  // Escape closes the panel unless something on top of it takes the key first: a popover
  // stops it in the capture phase, and an open dialog (such as a Modal) or popover means the
  // key belongs to that one (the toast does not count).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (overlayIsOpen()) return;
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <aside
      ref={panelRef}
      aria-label={ariaLabel}
      style={{ width: resize.width }}
      className="sticky top-topbar flex h-[calc(100dvh-var(--spacing-topbar))] shrink-0 self-start border-l border-line bg-surface"
    >
      {/* The handle is outside the scrolling part, so it stays put while the content scrolls. */}
      <PanelResizeHandle panelRef={panelRef} resize={resize} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PanelHeader breadcrumb={breadcrumb} onClose={onClose} />
          {children}
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </aside>
  );
}
