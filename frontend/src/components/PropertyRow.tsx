import type { ReactNode } from "react";

// The small uppercase label above or beside a value in a detail body.
export const LABEL_CLASS = "text-xs font-medium uppercase tracking-wide text-muted";

// One "label: value" row of a detail body's <dl>.
export default function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <dt className={`w-[88px] shrink-0 ${LABEL_CLASS}`}>{label}</dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  );
}
