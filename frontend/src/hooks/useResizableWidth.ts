import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const PANEL_MIN = 360;
export const PANEL_MAX = 720;
const LIST_MIN = 480; // the list beside the panel never gets narrower than this

function readStored(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback; // storage blocked (private window, site data off)
  }
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(PANEL_MIN, Math.round(value)));
}

// Width of an inline panel that the user can drag. The saved preference is kept as it is; what
// is shown is that preference clamped to what fits now. The room is measured from the left edge
// of the panel's parent (the page row), so a pinned or collapsed sidebar is accounted for, and a
// ResizeObserver re-measures when the window or the sidebar changes.
// The panel's parent must be a full-width row (the page row that holds the list and the panel):
// its left edge is taken as where the available room starts.
export function useResizableWidth(
  panelRef: RefObject<HTMLElement>,
  storageKey: string,
  defaultWidth: number
) {
  const [preferred, setPreferred] = useState(() => readStored(storageKey, defaultWidth));
  const [max, setMax] = useState(PANEL_MAX);
  const [dragging, setDragging] = useState(false);
  const changed = useRef(false); // nothing is saved until the user has changed the width

  useLayoutEffect(() => {
    const parent = panelRef.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const room = window.innerWidth - parent.getBoundingClientRect().left - LIST_MIN;
      setMax(Math.max(PANEL_MIN, Math.min(PANEL_MAX, room)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [panelRef]);

  // Saved once a drag has ended, a key step has been made or the width was reset: never on
  // every pointer move.
  useEffect(() => {
    if (!changed.current || dragging) return;
    try {
      localStorage.setItem(storageKey, String(preferred));
    } catch {
      // Not saved; the width still works for this visit.
    }
  }, [preferred, dragging, storageKey]);

  return {
    width: clamp(preferred, max),
    min: PANEL_MIN,
    max,
    setDragging,
    setWidth(next: number) {
      changed.current = true;
      setPreferred(clamp(next, max));
    },
    reset() {
      changed.current = true;
      setPreferred(defaultWidth);
    },
  };
}

export type ResizableWidth = ReturnType<typeof useResizableWidth>;
