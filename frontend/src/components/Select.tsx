import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { CONTROL, type ControlSize } from "./formStyles";

type SelectProps = {
  fieldSize?: ControlSize; // the field look; named so it cannot be mistaken for the native size
  // Classes for the wrapper, e.g. a width.
  wrapperClassName?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">;

// The one dropdown for the app. It is still the browser's own <select> (keyboard, mobile
// pickers and screen readers keep working); only the arrow is replaced, because the native one
// sits flush against the border. The icon ignores the pointer, so a click on it reaches the
// select and opens it. `className` replaces the default field look (the pages that have not
// been restyled yet pass their own); the right padding that keeps text off the icon is always
// added. Everything else, including the ref, goes to the <select>.
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { fieldSize = "md", wrapperClassName = "", className, children, ...rest },
  ref
) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        ref={ref}
        {...rest}
        className={`w-full appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-fill disabled:text-muted ${
          className ?? CONTROL[fieldSize]
        }`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
});

export default Select;
