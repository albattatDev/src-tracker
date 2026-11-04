import type { ReactNode } from "react";
import { useModalDialog } from "../hooks/useModalDialog";

// Literal strings so Tailwind sees them.
const WIDTH = { md: "max-w-md", lg: "max-w-[520px]" } as const;

// Render it only while it should be open (see useModalDialog).
export default function Modal({
  title,
  width = "md",
  onClose,
  isBusy = false,
  children,
}: {
  title: string;
  width?: keyof typeof WIDTH;
  onClose: () => void;
  isBusy?: boolean; // a running request cannot be dismissed
  children: ReactNode;
}) {
  const { ref, dialogProps } = useModalDialog(() => {
    if (!isBusy) onClose();
  });

  return (
    <dialog
      ref={ref}
      {...dialogProps}
      aria-labelledby="modal-title"
      className={`m-auto w-full rounded-lg p-0 shadow-xl backdrop:bg-black/40 ${WIDTH[width]}`}
    >
      <div className="p-5">
        <h2 id="modal-title" className="mb-4 text-base font-semibold text-gray-900">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
