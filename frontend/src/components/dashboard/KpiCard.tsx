import type { ReactNode } from "react";
import { ArrowRight, CircleCheck, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

// One "Needs attention" card. It is coloured only while the number is above 0: the icon tile
// takes `tone` (a className from Badges.tsx). At 0 the tile is grey and the line under the
// label says everything is fine (`clear`). The label is the card's link, stretched over the
// whole card; chips inside are links above it. `wide` makes it span both columns on mobile.
export default function KpiCard({
  to,
  icon: Icon,
  tone,
  count,
  label,
  clear,
  chips,
  wide = false,
}: {
  to: string;
  icon: LucideIcon;
  tone: string;
  count: number;
  label: string;
  clear: string;
  chips?: ReactNode;
  wide?: boolean;
}) {
  const active = count > 0;
  return (
    <div
      className={`relative flex min-w-0 flex-col rounded-card border border-line bg-surface p-4 hover:shadow-sm has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink md:p-5 ${
        wide ? "col-span-2 md:col-span-1" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-button ${
            active ? tone : "bg-fill text-muted"
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-muted" />
      </div>
      <p className={`mt-3 text-3xl font-semibold tabular-nums ${active ? "text-ink" : "text-muted"}`}>
        {count}
      </p>
      <Link
        to={to}
        className="mt-0.5 text-base font-medium outline-none after:absolute after:inset-0 after:rounded-card"
      >
        {label}
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0 md:gap-y-1.5">
        {active ? (
          chips
        ) : (
          <span className="inline-flex min-h-6 items-center gap-1.5 text-ink-soft">
            <CircleCheck size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-muted" />
            {clear}
          </span>
        )}
      </div>
    </div>
  );
}

// The grid of cards: two columns on mobile, 3 or 4 across from md / lg up.
export function KpiGrid({ children, columns }: { children: ReactNode; columns: 3 | 4 }) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 md:gap-4 ${
        columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"
      }`}
    >
      {children}
    </div>
  );
}
