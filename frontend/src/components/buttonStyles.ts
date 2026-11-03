// One place for the outline button looks. Every variant has the same white background and
// border width; only the colours differ. Use it as className={buttonClass("outline-danger")}.
export type ButtonVariant =
  | "outline-neutral"
  | "outline-success"
  | "outline-danger";

// "md" is the size of a standalone button (the Edit button); "sm" fits inside a table row.
export type ButtonSize = "md" | "sm";

const BASE =
  "rounded-md border bg-white disabled:cursor-not-allowed disabled:opacity-50";

const SIZES: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  sm: "px-2.5 py-1 text-xs font-medium",
};

const VARIANTS: Record<ButtonVariant, string> = {
  "outline-neutral": "border-gray-300 text-gray-900 hover:bg-gray-100",
  "outline-success": "border-green-700 text-green-700 hover:bg-green-50",
  "outline-danger": "border-red-700 text-red-700 hover:bg-red-50",
};

export function buttonClass(
  variant: ButtonVariant,
  size: ButtonSize = "md",
): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}
