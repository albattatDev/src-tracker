import { Link } from "react-router-dom";
import { useSrListLinks } from "../../hooks/useSrListLinks";

// "Service Requests / #id" for the panel header (inline panel and slide-over).
export default function SrBreadcrumb({ id }: { id: number }) {
  const { listPath } = useSrListLinks();
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link to={listPath} className="text-muted hover:text-ink">
        Service Requests
      </Link>
      <span aria-hidden="true" className="text-muted">
        /
      </span>
      <span className="font-medium">#{id}</span>
    </nav>
  );
}
