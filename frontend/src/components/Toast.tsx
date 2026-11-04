import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, CircleAlert, X } from "lucide-react";
import { POPOVER_ATTRS, TOAST_REGION_ATTR } from "../utils/overlays";
import { buttonClass } from "./buttonStyles";

const DISMISS_MS = 4000;

type Tone = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastApi {
  show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// The timer only runs while the pointer is away and focus is outside, so a toast being read
// (or reached with the keyboard) never disappears under the user. Leaving restarts the full time.
function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const { id } = toast;

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(id), DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [paused, id, onDismiss]);

  const Icon = toast.tone === "error" ? CircleAlert : Check;
  const tone =
    toast.tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-line bg-surface text-ink";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border py-1 pl-4 pr-1 text-sm shadow-popover ${tone}`}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      <span className="py-2">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className={buttonClass("ghost", "icon")}
      >
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    if (region.matches(":popover-open")) region.hidePopover();
    if (toasts.length > 0) region.showPopover();
  }, [toasts]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, tone }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* A live region only announces while it can be reached. A modal dialog makes everything
          outside it inert, so while one is open (a slide-over, a sheet) this is not announced;
          the toast is still shown. */}
      <div aria-live="polite" className="sr-only">
        {toasts[toasts.length - 1]?.message}
      </div>
      {/* A manual popover is drawn in the top layer, so a toast is visible above an open modal
          dialog and its backdrop. The UA popover styles (centred box with border, padding and
          background) are reset to a plain fixed row at the bottom centre. It is hidden when
          empty and shown again on every change, which moves it above any dialog opened later. */}
      <div
        ref={regionRef}
        {...POPOVER_ATTRS}
        // Open whenever a toast shows, so it must not count as an overlay that owns Escape.
        {...{ [TOAST_REGION_ATTR]: "" }}
        className="pointer-events-none fixed inset-auto bottom-4 left-1/2 m-0 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 open:flex"
      >
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
