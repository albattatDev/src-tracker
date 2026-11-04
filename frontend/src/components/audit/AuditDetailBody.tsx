import type { AuditLogOut } from "../../api/audit";
import { useAuth } from "../../hooks/useAuth";
import { summary } from "../../utils/auditDiff";
import { entityLink, entityText } from "../../utils/auditLinks";
import { formatRiyadh } from "../../utils/dates";
import { AuditActionBadge } from "../Badges";
import CrossLink from "../CrossLink";
import PropertyRow from "../PropertyRow";
import AuditChanges from "./AuditChanges";
import AuditUserName from "./AuditUserName";

// What the panel, the slide-over and the mobile screen all show for one audit entry. On mobile
// the chip sits above the title (as in the design); elsewhere it is at the end of the title row.
export default function AuditDetailBody({ row, mobile }: { row: AuditLogOut; mobile: boolean }) {
  const { user } = useAuth();
  const text = entityText(row);
  const link = entityLink(row, user?.role);

  return (
    <>
      {mobile ? (
        <div className="flex flex-col items-start gap-2">
          <AuditActionBadge action={row.action} />
          <h2 className="min-w-0 break-words text-xl font-semibold">{text}</h2>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-xl font-semibold">{text}</h2>
          <AuditActionBadge action={row.action} />
        </div>
      )}

      <dl className="mt-4 flex flex-col">
        <PropertyRow label="Time (Riyadh)">{formatRiyadh(row.created_at)}</PropertyRow>
        <PropertyRow label="User">
          <AuditUserName user={row.user} size={28} />
        </PropertyRow>
        <PropertyRow label="Entity">{link ? <CrossLink to={link}>{text}</CrossLink> : text}</PropertyRow>
      </dl>

      <div className="mb-3 mt-6 flex items-baseline gap-2">
        <h3 className="shrink-0 text-base font-semibold">Changes</h3>
        <span className="min-w-0 truncate text-sm text-muted" title={summary(row)}>
          {summary(row)}
        </span>
      </div>
      <AuditChanges row={row} mobile={mobile} />
    </>
  );
}
