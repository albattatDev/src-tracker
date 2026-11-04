import { DOC_TYPES, type ContractorListItem } from "../../api/contractors";
import { DocumentCountChip } from "../Badges";

// Only problems get a chip (expired / expiring); a healthy contractor shows just "x/5 uploaded".
export default function DocumentChips({ contractor }: { contractor: ContractorListItem }) {
  const { expiring_soon, expired } = contractor.doc_counts;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {expired > 0 && <DocumentCountChip status="expired" count={expired} />}
      {expiring_soon > 0 && <DocumentCountChip status="expiring_soon" count={expiring_soon} />}
      <span className="whitespace-nowrap text-sm text-muted">
        {contractor.types_uploaded}/{DOC_TYPES.length} uploaded
      </span>
    </div>
  );
}
