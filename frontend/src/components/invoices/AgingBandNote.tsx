import type { AgingBand } from "../../api/invoices";

// Shown while the Aging band filter is set: only pending invoices have a band.
export default function AgingBandNote({ band, className = "" }: { band?: AgingBand; className?: string }) {
  if (!band) return null;
  return (
    <p className={`text-xs text-muted ${className}`}>
      Only pending invoices have an aging band, so approved and rejected ones are not listed here.
    </p>
  );
}
