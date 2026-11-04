import { Link } from "react-router-dom";
import type { SRRead } from "../../api/serviceRequests";
import { useSrListLinks } from "../../hooks/useSrListLinks";
import { PersonName } from "../Avatar";
import { PriorityBadge, StatusBadge } from "../Badges";

// Mobile list: one card per request. The title link is stretched over the whole card.
export default function ServiceRequestCards({ items, dimmed }: { items: SRRead[]; dimmed: boolean }) {
  const { detailPath } = useSrListLinks();

  return (
    <ul className={`flex flex-col gap-3 ${dimmed ? "opacity-60" : ""}`}>
      {items.map((sr) => (
        <li key={sr.id} className="relative rounded-xl border border-line bg-surface p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">#{sr.id}</span>
            <PriorityBadge priority={sr.priority} />
          </div>
          <p className="mt-2 text-base font-medium">
            <Link to={detailPath(sr.id)} className="outline-none after:absolute after:inset-0">
              {sr.title}
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <StatusBadge status={sr.status} />
            <PersonName name={sr.assigned_engineer_name} emptyLabel="Unassigned" />
          </div>
        </li>
      ))}
    </ul>
  );
}
