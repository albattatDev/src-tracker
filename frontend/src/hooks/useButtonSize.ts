import type { ButtonSize } from "../components/buttonStyles";
import { useBreakpoint } from "./useBreakpoint";

// The button size a page-level action uses: 44px on mobile, the normal 36px otherwise.
export function useButtonSize(): Extract<ButtonSize, "touch" | "md"> {
  return useBreakpoint() === "mobile" ? "touch" : "md";
}
