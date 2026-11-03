import { Link, useNavigate } from "react-router-dom";
import type { SortOrder, SRRead, SRSortField } from "../api/serviceRequests";
import { formatRiyadh } from "../utils/dates";
import { PriorityBadge, StatusBadge } from "./Badges";

interface Sort {
  field: SRSortField;
  order: SortOrder;
}

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
  const arrow = isActive ? (sort.order === "asc" ? "▲" : "▼") : "";
  const ariaSort = isActive ? (sort.order === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className="px-3 py-2" aria-sort={ariaSort}>
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 font-semibold uppercase hover:text-gray-900"
      >
        {label}
        <span aria-hidden="true" className="w-3 text-gray-900">
          {arrow}
        </span>
      </button>
    </th>
  );
}

export default function ServiceRequestTable({
  items,
  sort,
  onSort,
  dimmed,
}: {
  items: SRRead[];
  sort: Sort;
  onSort: (field: SRSortField) => void;
  dimmed: boolean; // true while the next page loads, so the old rows look "stale"
}) {
  const navigate = useNavigate();
  return (
    <div
      className={`overflow-x-auto rounded-lg border border-gray-200 bg-white ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Title</th>
            <SortHeader label="Priority" field="priority" sort={sort} onSort={onSort} />
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Requester</th>
            <th className="px-3 py-2">Engineer</th>
            <SortHeader label="Created" field="created_at" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((sr) => (
            <tr
              key={sr.id}
              onClick={() => navigate(`/service-requests/${sr.id}`)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td className="px-3 py-2 text-gray-500">#{sr.id}</td>
              <td className="px-3 py-2 font-medium text-gray-900">
                {/* The real link keeps keyboard and middle-click working; the row click is a convenience. */}
                <Link
                  to={`/service-requests/${sr.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  {sr.title}
                </Link>
              </td>
              <td className="px-3 py-2">
                <PriorityBadge priority={sr.priority} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={sr.status} />
              </td>
              <td className="px-3 py-2 text-gray-700">{sr.requester_name}</td>
              <td className="px-3 py-2 text-gray-700">{sr.assigned_engineer_name ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                {formatRiyadh(sr.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
