import { Fragment, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { AuditLogOut } from "../api/audit";
import type { Role } from "../api/client";
import { changedFields, fieldLabel, formatValue, summary } from "../utils/auditDiff";
import { entityLabel, entityLink } from "../utils/auditLinks";
import { formatRiyadh } from "../utils/dates";
import { AuditActionBadge } from "./Badges";
import { PersonName } from "./Avatar";

const COLUMNS = 5;

function Changes({ row }: { row: AuditLogOut }) {
  const changes = changedFields(row.action, row.old_values, row.new_values);
  if (changes.length === 0) return <p className="text-gray-500">No field changes recorded.</p>;
  return (
    <dl className="space-y-2">
      {changes.map((change) => (
        <div key={change.field} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-3">
          <dt className="font-medium text-gray-700">{fieldLabel(change.field)}</dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words text-gray-900">
            {row.action === "create" ? (
              formatValue(change.new)
            ) : row.action === "delete" ? (
              formatValue(change.old)
            ) : (
              <>
                <span className="text-gray-500">{formatValue(change.old)}</span>
                <span className="px-1.5 text-gray-400">→</span>
                <span>{formatValue(change.new)}</span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AuditLogTable({
  items,
  role,
  dimmed = false,
}: {
  items: AuditLogOut[];
  role: Role | undefined;
  dimmed?: boolean;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  function toggle(id: number) {
    setOpenId((current) => (current === id ? null : id));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: number) {
    if (event.target !== event.currentTarget) return; // a link inside keeps its own keys
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(id);
    }
  }

  return (
    <div
      className={`overflow-x-auto rounded-lg border border-gray-200 bg-white ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Time (Riyadh)</th>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Entity</th>
            <th className="px-3 py-2">Changes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((row) => {
            const open = openId === row.id;
            const link = entityLink(row, role);
            const label = `${entityLabel(row.entity_type)} #${row.entity_id}`;
            return (
              <Fragment key={row.id}>
                <tr
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => {
                    // Selecting text to copy it should not toggle the row.
                    if (!window.getSelection()?.toString()) toggle(row.id);
                  }}
                  onKeyDown={(e) => onKeyDown(e, row.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                    {formatRiyadh(row.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                    {row.user ? (
                      <PersonName name={row.user.full_name} />
                    ) : (
                      <span className="text-gray-500">System</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <AuditActionBadge action={row.action} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {link ? (
                      <Link
                        to={link}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-900 hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      label
                    )}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-gray-700 sm:max-w-md">
                    {summary(row)}
                  </td>
                </tr>
                {open && (
                  <tr className="bg-gray-50">
                    <td colSpan={COLUMNS} className="px-4 py-3">
                      <Changes row={row} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
