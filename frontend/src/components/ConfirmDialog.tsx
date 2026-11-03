import { useEffect, useRef } from "react";
import type { Decision } from "../api/invoices";

// Solid colour plus a text label, so the meaning never depends on colour alone.
const TONE_BUTTON: Record<Decision, string> = {
  approve: "bg-green-700 text-white hover:bg-green-800",
  reject: "bg-red-700 text-white hover:bg-red-800",
};

// Render it only while it should be open: it opens as a modal when it mounts. The native
// <dialog> gives the backdrop, the focus trap and Escape-to-close.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone,
  onConfirm,
  onCancel,
  isLoading = false,
  error = null,
}: {
  title: string;
  message: string;
  confirmLabel: string; // the caller passes the running text ("Approving…") while isLoading
  tone: Decision;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      // Escape: the browser would close the dialog itself, which a running request must not allow.
      onCancel={(e) => {
        e.preventDefault();
        if (!isLoading) onCancel();
      }}
      // A click on the backdrop lands on the <dialog> element itself, not on its content.
      onClick={(e) => {
        if (e.target === ref.current && !isLoading) onCancel();
      }}
      className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-700">{message}</p>

        {error && (
          <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${TONE_BUTTON[tone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
