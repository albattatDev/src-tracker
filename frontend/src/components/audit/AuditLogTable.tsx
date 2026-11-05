import { Link } from "react-router-dom";
import type { AuditLogOut } from "../../api/audit";
import type { Role } from "../../api/client";
import { useListLinks } from "../../hooks/useListLinks";
import { AUDIT_BASE } from "../../routes";
import { summary } from "../../utils/auditDiff";
import { entityLink, entityText } from "../../utils/auditLinks";
import { formatRiyadh } from "../../utils/dates";
import { AuditActionBadge } from "../Badges";
import CrossLink from "../CrossLink";
import AuditUserName from "./AuditUserName";

const TH = "h-10 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted";

// Desktop and tablet table. The time is a real link stretched over the whole row
// (after:absolute after:inset-0 on a relative row); the entity cross-link sits above it
// (relative z-10). `wide` is the table beside the inline panel, which shows the changes itself,
// so it keeps Time, User, Action and Entity.
export default function AuditLogTable({
  items,
  role,
  wide,
  selectedId,
  dimmed,
  framed = true,
}: {
  items: AuditLogOut[];
  role: Role | undefined;
  wide: boolean;
  selectedId: number | undefined;
  dimmed: boolean; // true while the next page loads, so the old rows look "stale"
  framed?: boolean; // false inside something that already draws the border (the dashboard panel)
}) {
  const { detailPath } = useListLinks(AUDIT_BASE);

  return (
    <div
      className={`overflow-x-auto bg-surface ${framed ? "rounded-xl border border-line" : ""} ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas">
          <tr className="border-b border-line">
            <th className={TH}>Time (Riyadh)</th>
            <th className={TH}>User</th>
            <th className={TH}>Action</th>
            <th className={TH}>Entity</th>
            {/* Changes is also hidden below 1024px, simply because there is less screen width.
                Hiding a table cell with CSS is the accepted exception to "one component per
                breakpoint": useBreakpoint has no 1024px stop. */}
            {!wide && <th className={`${TH} hidden lg:table-cell`}>Changes</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((row) => {
            const selected = row.id === selectedId;
            const link = entityLink(row, role);
            const text = entityText(row);
            const changes = summary(row);
            return (
              <tr
                key={row.id}
                className={`relative h-[52px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink ${
                  selected ? "bg-fill" : "hover:bg-canvas"
                }`}
              >
                <td className="whitespace-nowrap px-4 py-2 font-medium">
                  <Link
                    to={detailPath(row.id)}
                    aria-current={selected ? "page" : undefined}
                    className="outline-none after:absolute after:inset-0 hover:underline"
                  >
                    {formatRiyadh(row.created_at)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <AuditUserName user={row.user} />
                </td>
                <td className="px-4 py-2">
                  <AuditActionBadge action={row.action} />
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  {link ? (
                    <CrossLink to={link} className="relative z-10">
                      {text}
                    </CrossLink>
                  ) : (
                    text
                  )}
                </td>
                {!wide && (
                  <td className="hidden max-w-xs truncate px-4 py-2 text-ink-soft lg:table-cell" title={changes}>
                    {changes}
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
