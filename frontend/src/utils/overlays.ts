// Helpers for the things drawn above the page: dialogs, popovers and toasts.

// `popover` is not in this React version's types yet. Spread attributes are not type checked
// for unknown names, so it goes through an object.
export const POPOVER_ATTRS = { popover: "manual" } as Record<string, string>;

// Marks the toast region, which is a popover too but never takes the keyboard.
export const TOAST_REGION_ATTR = "data-toast-region";

// True when something is open that should get the Escape key before whatever is under it: a
// dialog or a popover. The toast region is left out (it is open whenever a toast shows).
// `except` is the caller's own dialog: it and the dialogs it sits inside do not count, so a
// Modal opened from a slide-over can still close itself.
export function overlayIsOpen(except?: Element | null): boolean {
  const open = document.querySelectorAll(
    `dialog[open], :popover-open:not([${TOAST_REGION_ATTR}])`
  );
  for (const element of open) {
    if (element !== except && !(except && element.contains(except))) return true;
  }
  return false;
}
