import { Search } from "lucide-react";
import { CONTROL, type ControlSize } from "./formStyles";

// A search box. Controlled: the owner holds the text (useDebouncedSearch), because
// the Clear button next to it has to reset that text too.
export default function SearchField({
  text,
  onTextChange,
  size,
  maxLength,
  placeholder,
  ariaLabel,
  className = "",
}: {
  text: string;
  onTextChange: (next: string) => void;
  size: ControlSize;
  maxLength: number;
  placeholder: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={text}
        maxLength={maxLength}
        aria-label={ariaLabel}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pl-9 ${CONTROL[size]}`}
      />
    </div>
  );
}
