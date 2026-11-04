import Modal from "../Modal";
import NewRequestForm from "./NewRequestForm";

// Desktop and tablet: the new request form in a Modal about 520px wide.
export default function NewRequestDialog({
  onCreated,
  onCancel,
}: {
  onCreated: (id: number) => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="New Service Request" width="lg" onClose={onCancel}>
      <NewRequestForm size="md" onCreated={onCreated} onCancel={onCancel} />
    </Modal>
  );
}
