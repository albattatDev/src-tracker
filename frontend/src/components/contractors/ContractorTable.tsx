import { Link } from "react-router-dom";
import type { ContractorListItem } from "../../api/contractors";
import { useListLinks } from "../../hooks/useListLinks";
import { CONTRACTORS_BASE } from "../../routes";
import { PersonName } from "../Avatar";
import { ActiveBadge } from "../Badges";
import DocumentChips from "./DocumentChips";

const TH = "h-10 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted";

// Desktop and tablet table. The name is a real link stretched over the whole row
// (after:absolute after:inset-0 on a relative row). `wide` is the table beside the inline
// panel, which already shows the contact and the manager, so it keeps Name, Documents, Status.
export default function ContractorTable({
  items,
  wide,
  selectedId,
  dimmed,
}: {
  items: ContractorListItem[];
  wide: boolean;
  selectedId: number | undefined;
  dimmed: boolean; // true while the next page loads, so the old rows look "stale"
}) {
  const { detailPath } = useListLinks(CONTRACTORS_BASE);

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-line bg-surface ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas">
          <tr className="border-b border-line">
            <th className={TH}>Name</th>
            {/* Contact is also hidden below 1024px, simply because there is less screen width.
                Hiding a table cell with CSS is the accepted exception to "one component per
                breakpoint": useBreakpoint has no 1024px stop. */}
            {!wide && <th className={`${TH} hidden lg:table-cell`}>Contact</th>}
            {!wide && <th className={TH}>Internal manager</th>}
            <th className={TH}>Documents</th>
            <th className={TH}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((contractor) => {
            const selected = contractor.id === selectedId;
            return (
              <tr
                key={contractor.id}
                className={`relative h-[52px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink ${
                  selected ? "bg-fill" : "hover:bg-canvas"
                }`}
              >
                <td className="px-4 py-2 font-medium">
                  <Link
                    to={detailPath(contractor.id)}
                    aria-current={selected ? "page" : undefined}
                    className="outline-none after:absolute after:inset-0 hover:underline"
                  >
                    {contractor.name}
                  </Link>
                </td>
                {!wide && (
                  <td className="hidden whitespace-nowrap px-4 py-2 text-ink-soft lg:table-cell">
                    {contractor.contact_email}
                  </td>
                )}
                {!wide && (
                  <td className="whitespace-nowrap px-4 py-2">
                    <PersonName name={contractor.internal_manager_name} />
                  </td>
                )}
                <td className="px-4 py-2">
                  <DocumentChips contractor={contractor} />
                </td>
                <td className="px-4 py-2">
                  <ActiveBadge isActive={contractor.is_active} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
