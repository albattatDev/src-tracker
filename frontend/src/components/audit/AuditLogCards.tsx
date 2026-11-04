import { Link } from "react-router-dom";
import type { AuditLogOut } from "../../api/audit";
import { useListLinks } from "../../hooks/useListLinks";
import { AUDIT_BASE } from "../../routes";
import { summary } from "../../utils/auditDiff";
import { entityText } from "../../utils/auditLinks";
import { formatRiyadh } from "../../utils/dates";
import { AuditActionBadge } from "../Badges";
import AuditUserName from "./AuditUserName";

// Mobile list: one card per entry. The entity link is stretched over the whole card.
export default function AuditLogCards({ items, dimmed }: { items: AuditLogOut[]; dimmed: boolean }) {
  const { detailPath } = useListLinks(AUDIT_BASE);

  return (
    <ul className={`flex flex-col gap-3 ${dimmed ? "opacity-60" : ""}`}>
      {items.map((row) => (
        <li
          key={row.id}
          className="relative rounded-xl border border-line bg-surface p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-sm text-muted">{formatRiyadh(row.created_at)}</span>
            <AuditActionBadge action={row.action} />
          </div>
          <Link
            to={detailPath(row.id)}
            className="mt-2 block break-words text-base font-semibold outline-none after:absolute after:inset-0"
          >
            {entityText(row)}
          </Link>
          <div className="mt-2 text-sm">
            <AuditUserName user={row.user} size={28} />
          </div>
          <p className="mt-2 break-words text-sm text-muted">{summary(row)}</p>
        </li>
      ))}
    </ul>
  );
}
