import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { pillClass } from "../Badges";

// A small count or note inside a card. `colors` is always a className from Badges.tsx.
export function Chip({ colors, children }: { colors: string; children: ReactNode }) {
  return <span className={pillClass(colors)}>{children}</span>;
}

// A chip that is also a link. It sits above the card's stretched link (relative z-10). The link
// is 44px tall on mobile; the pill inside keeps its normal size.
export function ChipLink({
  to,
  colors,
  children,
}: {
  to: string;
  colors: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="relative z-10 inline-flex min-h-11 items-center md:min-h-0">
      <span className={`${pillClass(colors)} hover:brightness-95`}>{children}</span>
    </Link>
  );
}
