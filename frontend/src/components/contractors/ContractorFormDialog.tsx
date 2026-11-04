import type { Contractor } from "../../api/contractors";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import BottomSheet from "../BottomSheet";
import Modal from "../Modal";
import ContractorForm from "./ContractorForm";

// New / Edit contractor: a BottomSheet on mobile, a Modal on tablet and desktop.
export default function ContractorFormDialog({
  contractor,
  onClose,
}: {
  contractor?: Contractor;
  onClose: () => void;
}) {
  const title = contractor ? "Edit contractor" : "New contractor";

  if (useBreakpoint() === "mobile") {
    return (
      <BottomSheet title={title} onClose={onClose}>
        <ContractorForm contractor={contractor} size="touch" onSaved={onClose} onCancel={onClose} />
      </BottomSheet>
    );
  }
  return (
    <Modal title={title} width="lg" onClose={onClose}>
      <ContractorForm contractor={contractor} size="md" onSaved={onClose} onCancel={onClose} />
    </Modal>
  );
}
