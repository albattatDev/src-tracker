import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { SortOrder, SRRead, SRSortField } from "../../api/serviceRequests";
import { useSrListLinks } from "../../hooks/useSrListLinks";
import { formatRiyadh } from "../../utils/dates";
import { PersonName } from "../Avatar";
import { PriorityBadge } from "../Badges";
import AssignControl from "./AssignControl";
import StatusControl from "./StatusControl";

interface Sort {
  field: SRSortField;
  order: SortOrder;
}

const TH = "h-10 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted";

function SortHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SRSortField;
  sort: Sort;
  onSort: (field: SRSortField) => void;
}) {
  const isActive = sort.field === field;
  const ariaSort = isActive ? (sort.order === "asc" ? "ascending" : "descending") : "none";
  const Arrow = sort.order === "asc" ? ChevronUp : ChevronDown;

  return (
    <th className={TH} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 uppercase hover:text-ink"
      >
        {label}
        <span aria-hidden="true" className="flex size-3.5 items-center justify-center text-ink">
          {isActive && <Arrow size={14} strokeWidth={2} />}
        </span>
      </button>
    </th>
  );
}

// Desktop table. The title is a real link stretched over the whole row (after:absolute
// after:inset-0 on a relative row); the status and engineer controls are `relative z-10`, so
// they stay clickable above it. `compact` is the narrow table beside the panel: it drops
// Priority, Requester and Created.
export default function ServiceRequestTable({
  items,
  sort,
  onSort,
  dimmed,
  compact,
  selectedId,
}: {
  items: SRRead[];
  sort: Sort;
  onSort: (field: SRSortField) => void;
  dimmed: boolean; // true while the next page loads, so the old rows look "stale"
  compact: boolean;
  selectedId: number | undefined;
}) {
  const { detailPath } = useSrListLinks();

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-line bg-surface ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas">
          <tr className="border-b border-line">
            <th className={TH}>ID</th>
            <th className={TH}>Title</th>
            {!compact && <SortHeader label="Priority" field="priority" sort={sort} onSort={onSort} />}
            <th className={TH}>Status</th>
            {!compact && <th className={TH}>Requester</th>}
            <th className={TH}>Engineer</th>
            {!compact && <SortHeader label="Created" field="created_at" sort={sort} onSort={onSort} />}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((sr) => {
            const selected = sr.id === selectedId;
            return (
              <tr
                key={sr.id}
                // The ring is on the row: the stretched link would otherwise draw one box per
                // wrapped line. An outline, because box-shadow on a table row is unreliable.
                className={`relative h-[52px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink ${
                  selected ? "bg-fill" : "hover:bg-canvas"
                }`}
              >
                <td className="whitespace-nowrap px-4 py-2 text-muted">#{sr.id}</td>
                <td className="px-4 py-2 font-medium">
                  <Link
                    to={detailPath(sr.id)}
                    aria-current={selected ? "page" : undefined}
                    className="outline-none after:absolute after:inset-0 hover:underline"
                  >
                    {sr.title}
                  </Link>
                </td>
                {!compact && (
                  <td className="px-4 py-2">
                    <PriorityBadge priority={sr.priority} />
                  </td>
                )}
                <td className="px-4 py-2">
                  <StatusControl sr={sr} />
                </td>
                {!compact && (
                  <td className="whitespace-nowrap px-4 py-2 text-ink-soft">
                    <PersonName name={sr.requester_name} />
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-2 text-ink-soft">
                  <AssignControl sr={sr} />
                </td>
                {!compact && (
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-ink-soft">
                    {formatRiyadh(sr.created_at)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
