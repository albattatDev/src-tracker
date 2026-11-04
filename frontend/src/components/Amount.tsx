import { formatAmountNumber } from "../utils/money";

// "42,000.00 SAR": the number first, then the currency in muted text. Digits line up in columns.
export default function Amount({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatAmountNumber(value)} <span className="text-muted">SAR</span>
    </span>
  );
}
