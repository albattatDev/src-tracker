import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

// A link from one record to another page: underlined in grey with an arrow, so it reads as
// "goes somewhere else" and not as a status or a label.
export default function CrossLink({
  to,
  className = "",
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 underline decoration-line-strong underline-offset-4 hover:decoration-ink ${className}`}
    >
      {children}
      <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-muted" />
    </Link>
  );
}
