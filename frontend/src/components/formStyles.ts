// Shared look for form controls, in two sizes: md 36px on desktop, touch 48px with 16px text
// on mobile (16px stops iOS zooming into the field). Literal strings so Tailwind sees them.
export type ControlSize = "md" | "touch";

export const CONTROL: Record<ControlSize, string> = {
  md: "h-9 rounded-field border border-line-strong bg-surface px-2.5 text-sm text-ink",
  touch: "h-12 rounded-field border border-line-strong bg-surface px-3 text-base text-ink",
};

// A textarea grows with its rows, so it has padding instead of a fixed height.
export const TEXTAREA: Record<ControlSize, string> = {
  md: "rounded-field border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink",
  touch: "rounded-field border border-line-strong bg-surface px-3 py-2.5 text-base text-ink",
};

export const LABEL: Record<ControlSize, string> = {
  md: "text-xs font-medium text-ink-soft",
  touch: "text-sm font-medium text-ink-soft",
};
