import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useModalDialog } from "../hooks/useModalDialog";
import { buttonClass } from "./buttonStyles";

// A sheet from the bottom edge, for mobile. Render it only while it should be open (see
// useModalDialog).
export default function BottomSheet({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { ref, dialogProps } = useModalDialog(onClose);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      {...dialogProps}
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-black/40 open:flex"
    >
      <div aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" />
      <div className="flex shrink-0 items-center justify-between gap-2 py-1 pl-4 pr-2">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={buttonClass("ghost", "icon-touch")}
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      {footer && <div className="flex shrink-0 gap-3 border-t border-line p-4">{footer}</div>}
    </dialog>
  );
}
