import { Link } from "react-router-dom";
import type { ContractorListItem } from "../../api/contractors";
import { useListLinks } from "../../hooks/useListLinks";
import { CONTRACTORS_BASE } from "../../routes";
import { PersonName } from "../Avatar";
import { ActiveBadge } from "../Badges";
import DocumentChips from "./DocumentChips";

// Mobile list: one card per contractor. The name link is stretched over the whole card.
export default function ContractorCards({
  items,
  dimmed,
}: {
  items: ContractorListItem[];
  dimmed: boolean;
}) {
  const { detailPath } = useListLinks(CONTRACTORS_BASE);

  return (
    <ul className={`flex flex-col gap-3 ${dimmed ? "opacity-60" : ""}`}>
      {items.map((contractor) => (
        <li
          key={contractor.id}
          className="relative rounded-xl border border-line bg-surface p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink"
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              to={detailPath(contractor.id)}
              className="min-w-0 text-base font-semibold outline-none after:absolute after:inset-0"
            >
              {contractor.name}
            </Link>
            <ActiveBadge isActive={contractor.is_active} />
          </div>
          <p className="mt-2 truncate text-sm text-muted">{contractor.contact_email}</p>
          <div className="mt-2 text-sm">
            <PersonName name={contractor.internal_manager_name} size={28} />
          </div>
          <div className="mt-3">
            <DocumentChips contractor={contractor} />
          </div>
        </li>
      ))}
    </ul>
  );
}
