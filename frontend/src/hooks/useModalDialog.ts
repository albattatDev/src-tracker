import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from "react";
import { overlayIsOpen } from "../utils/overlays";
import { useRestoreFocus } from "./useRestoreFocus";

// The behaviour every modal in the app shares, on the native <dialog>. Render the dialog only
// while it should be open: it opens as a modal when it mounts.
//
//   const { ref, dialogProps } = useModalDialog(onClose);
//   <dialog ref={ref} {...dialogProps} className="...">
//
// The dialog itself gives the backdrop and the focus trap. This adds: opening on mount;
// Escape calls onClose, except in the same press that closes a popover inside the dialog (the
// popover goes first); a click on the backdrop calls onClose; focus goes back to the opener.
// A dialog that must not close while busy passes an onClose that checks that.
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useRestoreFocus();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const dialogProps = {
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      // The browser would close the dialog itself, which a busy dialog must not allow.
      event.preventDefault();
      if (!overlayIsOpen(ref.current)) onClose();
    },
    // A click on the backdrop lands on the <dialog> element itself, not on its content.
    onClick(event: MouseEvent<HTMLDialogElement>) {
      if (event.target === ref.current) onClose();
    },
  };

  return { ref, dialogProps };
}
