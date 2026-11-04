import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface TopBarState {
  slot: HTMLElement | null;
  setSlot: (element: HTMLElement | null) => void;
  overriding: boolean;
  setOverriding: (value: boolean) => void;
}

const TopBarContext = createContext<TopBarState | null>(null);

function useTopBar(): TopBarState {
  const context = useContext(TopBarContext);
  if (!context) throw new Error("Top bar components must be used inside TopBarProvider");
  return context;
}

// AppLayout wraps its shell in this. A screen that wants its own mobile top bar (a back arrow
// and a title, say) renders <TopBarOverride>; the layout needs no knowledge of which routes do.
export function TopBarProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [overriding, setOverriding] = useState(false);
  const value = useMemo(() => ({ slot, setSlot, overriding, setOverriding }), [slot, overriding]);
  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>;
}

// The mobile part of the top bar. Shows `fallback` (hamburger and section title) unless a
// screen has taken it over; the screen's content is portalled into the empty element after it.
export function TopBarSlot({ fallback }: { fallback: ReactNode }) {
  const { setSlot, overriding } = useTopBar();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
      {!overriding && fallback}
      <div ref={setSlot} className="contents" />
    </div>
  );
}

// Replaces the fallback while it is mounted, so the override goes away with its screen
// (back, navigation, or the window growing past md). A layout effect flips the flag before the
// browser paints, and on a hard refresh the slot element does not exist on the very first render:
// it is set by the ref in the same commit, which re-renders before paint, so the fallback bar
// never shows.
export function TopBarOverride({ children }: { children: ReactNode }) {
  const { slot, setOverriding } = useTopBar();

  useLayoutEffect(() => {
    setOverriding(true);
    return () => setOverriding(false);
  }, [setOverriding]);

  return slot ? createPortal(children, slot) : null;
}
