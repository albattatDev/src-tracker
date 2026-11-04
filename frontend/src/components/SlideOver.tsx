import type { ReactNode } from "react";
import { useModalDialog } from "../hooks/useModalDialog";
import PanelHeader from "./PanelHeader";

// The panel for medium screens, where there is no room beside the list: a drawer from the
// right. Render it only while it should be open (see useModalDialog).
// Same props as SidePanel apart from the width, which is fixed here (never wider than 92vw).
export default function SlideOver({
  "aria-label": ariaLabel,
  width,
  breadcrumb,
  actions,
  onClose,
  footer,
  children,
}: {
  "aria-label": string;
  width: number;
  breadcrumb: ReactNode;
  actions?: ReactNode; // header buttons next to the close button
  onClose: () => void;
  footer?: ReactNode; // pinned under the scrolling content (e.g. the action buttons)
  children: ReactNode;
}) {
  const { ref, dialogProps } = useModalDialog(onClose);

  return (
    <dialog
      ref={ref}
      {...dialogProps}
      aria-label={ariaLabel}
      style={{ width: `min(${width}px, 92vw)` }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none max-w-none flex-col overflow-hidden border-l border-line bg-surface p-0 text-ink backdrop:bg-black/40 open:flex"
    >
      <PanelHeader breadcrumb={breadcrumb} actions={actions} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0">{footer}</div>}
    </dialog>
  );
}
