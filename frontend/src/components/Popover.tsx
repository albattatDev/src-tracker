import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { POPOVER_ATTRS } from "../utils/overlays";

const GAP = 4;
const MARGIN = 8;

export interface PopoverTriggerProps {
  ref: RefObject<HTMLButtonElement>;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "menu" | "dialog";
  "aria-controls": string | undefined;
}

// A small panel anchored under its trigger. It uses the native popover element, so it is drawn
// in the top layer and a table's overflow cannot clip it. The popover API gives no outside
// click or Escape handling for "manual" popovers, so those are added here:
// - Escape is caught in the capture phase and stopped, so a SidePanel behind it stays open.
// - A press outside, a scroll outside it, or a resize closes it without stealing focus.
// - Focus moves in when it opens and back to the trigger after Escape or a pick.
// `children` gets close(): call it after a pick.
export default function Popover({
  haspopup,
  renderTrigger,
  children,
}: {
  haspopup: "menu" | "dialog";
  renderTrigger: (props: PopoverTriggerProps) => ReactNode;
  children: (close: (restoreFocus?: boolean) => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Position under the trigger (above it when there is no room), then move focus in.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!open || !panel || !trigger) return;

    panel.showPopover();
    const rect = trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panel;
    const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN));
    const below = rect.bottom + GAP;
    const above = rect.top - GAP - height;
    const fitsBelow = below + height <= window.innerHeight - MARGIN;
    panel.style.left = `${left}px`;
    panel.style.top = `${fitsBelow || above < MARGIN ? below : above}px`;

    (panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel).focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    }
    function onScroll(event: Event) {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      close(false);
    }
    const onResize = () => close(false);

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        onClick: () => (open ? close() : setOpen(true)),
        "aria-expanded": open,
        "aria-haspopup": haspopup,
        "aria-controls": open ? id : undefined,
      })}
      {open && (
        <div
          ref={panelRef}
          id={id}
          {...POPOVER_ATTRS}
          tabIndex={-1}
          // Tabbing out of the popover closes it. A null relatedTarget (a click on padding)
          // is not leaving.
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && !event.currentTarget.contains(next)) close(false);
          }}
          className="m-0 inset-auto min-w-56 max-w-[calc(100vw-1rem)] rounded-xl border-0 bg-surface p-1 text-ink shadow-popover outline-none"
        >
          {children(close)}
        </div>
      )}
    </>
  );
}
