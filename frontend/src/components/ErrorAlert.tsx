import { buttonClass } from "./buttonStyles";

// A failed load: the message and a Retry button.
export default function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <p className="mb-3">{message}</p>
      <button type="button" onClick={onRetry} className={buttonClass("primary", "md")}>
        Retry
      </button>
    </div>
  );
}
