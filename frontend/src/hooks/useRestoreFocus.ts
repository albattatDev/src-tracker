import { useEffect, useLayoutEffect, useRef } from "react";

// What was last pressed with a pointer. A pointer press does not always move focus (Safari
// does not focus links or buttons on click), so document.activeElement alone cannot tell what
// opened a dialog there. A key press switches back to activeElement, which is right for the
// keyboard everywhere.
let lastPointerTarget: Element | null = null;
let lastInputWasPointer = false;

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (event) => {
      lastPointerTarget = event.target instanceof Element ? event.target : null;
      lastInputWasPointer = true;
    },
    true
  );
  document.addEventListener(
    "keydown",
    () => {
      lastInputWasPointer = false;
    },
    true
  );
}

const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]";

function findOpener(): HTMLElement | null {
  const element = lastInputWasPointer
    ? (lastPointerTarget?.closest<HTMLElement>(FOCUSABLE) ?? null)
    : document.activeElement;
  return element instanceof HTMLElement && element !== document.body ? element : null;
}

// For anything that opens as a modal and goes away by unmounting (every dialog here, opened
// by a button or by a route change): remember the opener when it mounts and focus it again
// when it unmounts. Used by useModalDialog, so no dialog needs a ref to its opener.
export function useRestoreFocus() {
  const opener = useRef<HTMLElement | null>(null);

  // A layout effect, so this runs before the dialog moves focus into itself.
  useLayoutEffect(() => {
    opener.current = findOpener();
  }, []);

  // The cleanup of a passive effect runs after the dialog has left the page. In a layout
  // cleanup the modal would still be open and everything outside it inert, so focus() would
  // do nothing.
  useEffect(
    () => () => {
      if (opener.current?.isConnected) opener.current.focus();
    },
    []
  );
}
