import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";

// A click on any of these inside the row belongs to that control, not to the row.
const INTERACTIVE = "a, button, input, select, textarea, label, [role=button]";

const ROW_CLASS = "cursor-pointer hover:bg-gray-50";

// Makes a whole table row clickable. Keep a real <Link> in one cell too: it is what gives
// keyboard users and "open in new tab" a target, and the row click is only a convenience.
//
//   const { rowProps } = useRowNavigation();
//   <tr {...rowProps(`/contractors/${id}`)}>
//
// With no target (rowProps(undefined)) the row is left alone: no handler, no pointer cursor.
export function useRowNavigation() {
  const navigate = useNavigate();

  function rowProps(to: string | undefined) {
    if (to === undefined) return {};
    const target: string = to; // narrowed here; a nested function would lose the narrowing

    function onClick(event: MouseEvent<HTMLTableRowElement>) {
      // Let the browser handle new-tab / new-window / download clicks and non-left buttons.
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }
      // Something inside the row already handled this click.
      if (event.defaultPrevented) return;
      // The user is selecting text (to copy it), not asking to open the row.
      if (window.getSelection()?.toString()) return;
      // Links, buttons and form controls keep their own behaviour. The row check matters:
      // an interactive element around the whole table must not block every row.
      const control = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
      if (control && event.currentTarget.contains(control)) return;

      navigate(target);
    }

    return { onClick, className: ROW_CLASS };
  }

  return { rowProps };
}
