import { useEffect, useRef, type ReactNode } from "react";

// Render it only while it should be open: it opens as a modal when it mounts (same approach
// as ConfirmDialog). The native <dialog> gives the backdrop, the focus trap and Escape.
export default function Modal({
  title,
  onClose,
  isBusy = false,
  children,
}: {
  title: string;
  onClose: () => void;
  isBusy?: boolean; // a running request cannot be dismissed
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!isBusy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !isBusy) onClose();
      }}
      className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/40"
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
