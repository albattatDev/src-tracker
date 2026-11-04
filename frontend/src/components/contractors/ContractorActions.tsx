import { useState } from "react";
import { Pencil, Power } from "lucide-react";
import type { ContractorDetail } from "../../api/contractors";
import { useUpdateContractor } from "../../hooks/useContractors";
import { buttonClass, type ButtonVariant } from "../buttonStyles";
import ConfirmDialog from "../ConfirmDialog";
import type { ControlSize } from "../formStyles";
import { useToast } from "../Toast";
import ContractorFormDialog from "./ContractorFormDialog";

// How the activate / deactivate button, its confirmation and its toast read, per direction.
const ACTIVATION = {
  activate: {
    label: "Activate",
    busy: "Activating…",
    done: "activated",
    variant: "success" as ButtonVariant,
    tone: "approve" as const,
    isActive: true, // what the contractor becomes
    message: (name: string) => `Activate ${name}? Documents can be uploaded to it again.`,
  },
  deactivate: {
    label: "Deactivate",
    busy: "Deactivating…",
    done: "deactivated",
    variant: "danger" as ButtonVariant,
    tone: "reject" as const,
    isActive: false,
    message: (name: string) =>
      `Deactivate ${name}? It stays in the system with its documents, but no new documents can be uploaded until it is activated again.`,
  },
};

// Edit and Activate / Deactivate with their dialogs. Only managers get here (the caller checks
// canWriteContractors).
export default function ContractorActions({
  contractor,
  size,
}: {
  contractor: ContractorDetail;
  size: ControlSize;
}) {
  const toast = useToast();
  const update = useUpdateContractor(contractor.id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const action = ACTIVATION[contractor.is_active ? "deactivate" : "activate"];

  function openConfirm() {
    update.reset(); // an old error must not show up in the next dialog
    setConfirming(true);
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", size)}>
          <Pencil size={16} strokeWidth={2} aria-hidden="true" />
          Edit
        </button>
        <button type="button" onClick={openConfirm} className={buttonClass(action.variant, size)}>
          <Power size={16} strokeWidth={2} aria-hidden="true" />
          {action.label}
        </button>
      </div>

      {editing && <ContractorFormDialog contractor={contractor} onClose={() => setEditing(false)} />}
      {confirming && (
        <ConfirmDialog
          title={`${action.label} contractor`}
          message={action.message(contractor.name)}
          confirmLabel={update.isPending ? action.busy : action.label}
          tone={action.tone}
          onConfirm={() =>
            update.mutate(
              { is_active: action.isActive },
              {
                onSuccess: () => {
                  setConfirming(false);
                  toast.show(`${contractor.name} ${action.done}`);
                },
              }
            )
          }
          onCancel={() => setConfirming(false)}
          isLoading={update.isPending}
          error={update.error?.message ?? null}
        />
      )}
    </>
  );
}
