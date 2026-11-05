import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SRRead } from "../../api/serviceRequests";
import { SR_BASE } from "../../routes";
import { formatRiyadh } from "../../utils/dates";
import { PersonName } from "../Avatar";
import { PriorityBadge, StatusBadge } from "../Badges";
import type { ListLayout } from "./listLayout";

const TH = "h-10 px-5 text-left text-xs font-medium uppercase tracking-wide text-muted";

// Which optional columns a list shows (ID, title and priority are always there).
export interface RequestColumns {
  requester?: boolean; // "Requested by …" under the title
  status?: boolean;
  engineer?: boolean;
  created?: boolean;
}

// A short list of requests, as a table or as cards (`layout`). The title links to the request.
// `renderAction` puts a control in an extra column / at the bottom of the card; it sits above
// the stretched title link (relative z-10).
export default function RequestList({
  items,
  layout,
  columns,
  actionHeader,
  renderAction,
}: {
  items: SRRead[];
  layout: ListLayout;
  columns: RequestColumns;
  actionHeader?: string;
  renderAction?: (sr: SRRead) => ReactNode;
}) {
  if (layout === "cards") {
    return (
      <ul className="flex flex-col gap-3">
        {items.map((sr) => (
          <li
            key={sr.id}
            className="relative rounded-card border border-line bg-surface p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink"
          >
            <p className="text-base font-semibold">
              <span className="font-normal text-muted">#{sr.id}</span>{" "}
              <Link to={`${SR_BASE}/${sr.id}`} className="outline-none after:absolute after:inset-0">
                {sr.title}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={sr.priority} />
              {columns.status && <StatusBadge status={sr.status} />}
            </div>
            {columns.requester && <p className="mt-2 text-ink-soft">Requested by {sr.requester_name}</p>}
            {columns.engineer && (
              <div className="mt-2 text-ink-soft">
                <PersonName name={sr.assigned_engineer_name} emptyLabel="Unassigned" />
              </div>
            )}
            {columns.created && <p className="mt-2 text-sm text-muted">{formatRiyadh(sr.created_at)}</p>}
            {renderAction && <div className="relative z-10 mt-3">{renderAction(sr)}</div>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas">
          <tr className="border-b border-line">
            <th className={TH}>ID</th>
            <th className={TH}>Title</th>
            <th className={TH}>Priority</th>
            {columns.status && <th className={TH}>Status</th>}
            {columns.engineer && <th className={TH}>Engineer</th>}
            {columns.created && <th className={TH}>Created</th>}
            {renderAction && <th className={TH}>{actionHeader ?? "Actions"}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((sr) => (
            <tr
              key={sr.id}
              className="relative has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink hover:bg-canvas"
            >
              <td className="whitespace-nowrap px-5 py-3 text-muted">#{sr.id}</td>
              <td className="px-5 py-3">
                <Link
                  to={`${SR_BASE}/${sr.id}`}
                  className="font-semibold outline-none after:absolute after:inset-0 hover:underline"
                >
                  {sr.title}
                </Link>
                {columns.requester && <p className="text-ink-soft">Requested by {sr.requester_name}</p>}
              </td>
              <td className="px-5 py-3">
                <PriorityBadge priority={sr.priority} />
              </td>
              {columns.status && (
                <td className="px-5 py-3">
                  <StatusBadge status={sr.status} />
                </td>
              )}
              {columns.engineer && (
                <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                  <PersonName name={sr.assigned_engineer_name} emptyLabel="Unassigned" />
                </td>
              )}
              {columns.created && (
                <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-soft">
                  {formatRiyadh(sr.created_at)}
                </td>
              )}
              {renderAction && (
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="relative z-10 inline-block">{renderAction(sr)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
