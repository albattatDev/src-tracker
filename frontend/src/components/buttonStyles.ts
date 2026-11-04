// One place for button looks. Use it as className={buttonClass("danger", "sm")}.
// Every variant gets the same disabled look (grey fill, muted text) from BASE.
// Colours come from the theme in index.css and from Tailwind's green and red scales.
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "success"
  | "danger";

// sm 32 for table rows, md 36 elsewhere, touch 44 on mobile, touch-lg 48 for sticky mobile actions.
export type ButtonSize = "sm" | "md" | "touch" | "touch-lg";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-button border font-medium whitespace-nowrap " +
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-fill disabled:text-muted";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-4 text-sm",
  touch: "h-11 px-4 text-sm",
  "touch-lg": "h-12 px-5 text-base",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-white hover:bg-ink-soft",
  secondary: "border-line-strong bg-surface text-ink hover:bg-fill",
  ghost: "border-transparent bg-transparent text-ink-soft hover:bg-fill",
  success: "border-green-600 bg-surface text-green-700 hover:bg-green-50",
  danger: "border-red-600 bg-surface text-red-700 hover:bg-red-50",
};

export function buttonClass(variant: ButtonVariant, size: ButtonSize = "md"): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}
