import { DOC_TYPES, type ContractorDetail } from "../../api/contractors";
import { useAuth } from "../../hooks/useAuth";
import { canWriteContractors } from "../../utils/permissions";
import { PersonName } from "../Avatar";
import { ActiveBadge } from "../Badges";
import PropertyRow from "../PropertyRow";
import ContractorActions from "./ContractorActions";
import ContractorDocuments from "./ContractorDocuments";

// What the panel, the slide-over and the mobile screen all show for one contractor. Edit and
// Activate / Deactivate sit under the name (as in the design), not in the panel header.
export default function ContractorDetailBody({
  contractor,
  mobile,
}: {
  contractor: ContractorDetail;
  mobile: boolean;
}) {
  const { user } = useAuth();
  const canWrite = canWriteContractors(user?.role);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-xl font-semibold">{contractor.name}</h2>
        <ActiveBadge isActive={contractor.is_active} />
      </div>

      {canWrite && <ContractorActions contractor={contractor} size={mobile ? "touch" : "md"} />}

      <dl className="mt-4 flex flex-col">
        <PropertyRow label="Contact email">
          <span className="break-words">{contractor.contact_email}</span>
        </PropertyRow>
        <PropertyRow label="Internal manager">
          <PersonName name={contractor.internal_manager_name} size={28} />
        </PropertyRow>
      </dl>

      <div className="mb-3 mt-6 flex items-baseline gap-2">
        <h3 className="text-base font-semibold">Safety documents</h3>
        <span className="text-sm text-muted">
          {contractor.current_documents.length}/{DOC_TYPES.length} uploaded
        </span>
      </div>
      <ContractorDocuments
        contractorId={contractor.id}
        documents={contractor.current_documents}
        canWrite={canWrite}
        isActive={contractor.is_active}
        mobile={mobile}
      />
    </>
  );
}
