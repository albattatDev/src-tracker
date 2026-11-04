import { Link } from "react-router-dom";
import { DOC_TYPES, type ContractorListItem } from "../api/contractors";
import { useRowNavigation } from "../hooks/useRowNavigation";
import { PersonName } from "./Avatar";
import ContractorStatusBadge from "./ContractorStatusBadge";

const CHIP = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";

// Only problems get a chip (expiring / expired); a healthy contractor shows just "n/5".
function DocumentChips({ contractor }: { contractor: ContractorListItem }) {
  const { expiring_soon, expired } = contractor.doc_counts;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {expired > 0 && (
        <span className={`${CHIP} bg-red-100 text-red-800`}>{expired} expired</span>
      )}
      {expiring_soon > 0 && (
        <span className={`${CHIP} bg-yellow-100 text-yellow-800`}>{expiring_soon} expiring</span>
      )}
      <span className="whitespace-nowrap text-xs text-gray-600">
        {contractor.types_uploaded}/{DOC_TYPES.length} uploaded
      </span>
    </div>
  );
}

export default function ContractorTable({
  items,
  dimmed = false,
}: {
  items: ContractorListItem[];
  dimmed?: boolean;
}) {
  const { rowProps } = useRowNavigation();
  return (
    <div
      className={`overflow-x-auto rounded-lg border border-gray-200 bg-white ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Contact</th>
            <th className="px-3 py-2">Internal manager</th>
            <th className="px-3 py-2">Documents</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((contractor) => (
            <tr key={contractor.id} {...rowProps(`/contractors/${contractor.id}`)}>
              <td className="px-3 py-2 font-medium">
                <Link to={`/contractors/${contractor.id}`} className="text-gray-900 hover:underline">
                  {contractor.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{contractor.contact_email}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                <PersonName name={contractor.internal_manager_name} />
              </td>
              <td className="px-3 py-2">
                <DocumentChips contractor={contractor} />
              </td>
              <td className="px-3 py-2">
                <ContractorStatusBadge isActive={contractor.is_active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
