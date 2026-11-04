import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// "List / current" for the panel header (inline panel and slide-over).
export default function DetailBreadcrumb({
  listLabel,
  listPath,
  current,
}: {
  listLabel: string;
  listPath: string;
  current: ReactNode;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link to={listPath} className="text-muted hover:text-ink">
        {listLabel}
      </Link>
      <span aria-hidden="true" className="text-muted">
        /
      </span>
      <span className="truncate font-medium">{current}</span>
    </nav>
  );
}
