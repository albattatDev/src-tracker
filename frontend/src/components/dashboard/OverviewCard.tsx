import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { NEUTRAL_PILL, pillClass } from "../Badges";

export interface OverviewItem {
  key: string;
  label: string;
  count: number;
  colors: string; // a className from Badges.tsx; a count of 0 is shown grey instead
  to: string;
}

// A stacked bar and one legend row per item. Every bar segment and every row links to the page
// with that filter applied. Segment widths are flex-grow values (inline style: a width computed
// from data cannot be a Tailwind class). The 44px hit area of a segment is a pseudo-element,
// so the thin bar stays thin.
export default function OverviewCard({
  title,
  meta,
  items,
}: {
  title: string;
  meta: string;
  items: OverviewItem[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="min-w-0 rounded-card border border-line bg-surface p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 text-base font-semibold">{title}</h3>
        <span className="shrink-0 text-sm text-muted">{meta}</span>
      </div>

      {total === 0 ? (
        <div aria-hidden="true" className="mb-5 mt-4 h-2.5 rounded-full bg-fill" />
      ) : (
        <div className="mb-5 mt-4 flex h-2.5 gap-0.5">
          {items
            .filter((item) => item.count > 0)
            .map((item) => (
              <Link
                key={item.key}
                to={item.to}
                aria-label={`${item.label}: ${item.count}`}
                title={`${item.label}: ${item.count}`}
                style={{ flexGrow: item.count, flexBasis: 0 }}
                className={`relative min-w-1.5 rounded-full border border-current/30 before:absolute before:-inset-y-[17px] before:inset-x-0 hover:brightness-95 ${item.colors}`}
              />
            ))}
        </div>
      )}

      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <Link
              to={item.to}
              className="flex min-h-11 items-center justify-between gap-3 rounded-button px-1 hover:bg-fill"
            >
              <span className={`${pillClass(item.count > 0 ? item.colors : NEUTRAL_PILL)} max-w-full truncate`}>
                {item.label}
              </span>
              <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums">
                {item.count}
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="text-muted" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Two overview cards side by side from lg up.
export function OverviewGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:gap-4 lg:grid-cols-2">{children}</div>;
}
