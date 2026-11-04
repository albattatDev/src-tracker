import { useSyncExternalStore } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

// Same widths as Tailwind's md (768px) and xl (1280px). Used to render ONE of several
// different trees (inline panel, slide-over, full screen) instead of rendering all of them and
// hiding some with CSS. The snapshot is a plain string, so React can compare it by value.
const MD = "(min-width: 768px)";
const XL = "(min-width: 1280px)";

function subscribe(onChange: () => void): () => void {
  const queries = [window.matchMedia(MD), window.matchMedia(XL)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Breakpoint {
  if (window.matchMedia(XL).matches) return "desktop";
  return window.matchMedia(MD).matches ? "tablet" : "mobile";
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, () => "mobile");
}
