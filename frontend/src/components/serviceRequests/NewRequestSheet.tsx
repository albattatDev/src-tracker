import BottomSheet from "../BottomSheet";
import NewRequestForm from "./NewRequestForm";

// Mobile: the same form in a bottom sheet.
export default function NewRequestSheet({
  onCreated,
  onCancel,
}: {
  onCreated: (id: number) => void;
  onCancel: () => void;
}) {
  return (
    <BottomSheet title="New Service Request" onClose={onCancel}>
      <NewRequestForm size="touch" onCreated={onCreated} onCancel={onCancel} />
    </BottomSheet>
  );
}
