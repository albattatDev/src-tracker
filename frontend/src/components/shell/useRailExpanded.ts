import { useState, type FocusEvent, type PointerEvent } from "react";

// Whether the desktop rail is open: pinned, hovered, or reached with the keyboard.
// Spread `handlers` on the rail element.
export function useRailExpanded(pinned: boolean) {
  const [hovering, setHovering] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);

  const expanded = pinned || hovering || keyboardFocus;

  const handlers = {
    // Mouse only: a tap on a touch screen fires mouse events but never a leave, which would
    // leave the rail stuck open over the content.
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") setHovering(true);
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === "mouse") setHovering(false);
    },
    // Only keyboard focus opens the rail. A mouse click on the pin toggle also focuses it,
    // and that must not keep an unpinned rail open after the pointer leaves.
    onFocus: (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) {
        setKeyboardFocus(true);
      }
    },
    onBlur: (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node && event.currentTarget.contains(next))) {
        setKeyboardFocus(false);
      }
    },
  };

  // An open, unpinned rail covers the content, so it gets the popover shadow.
  return { expanded, overlay: expanded && !pinned, handlers };
}
