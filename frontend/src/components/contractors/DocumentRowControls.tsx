import type { ButtonSize } from "../buttonStyles";
import DocumentActions from "./DocumentActions";
import DocumentHistory from "./DocumentHistory";
import type { DocumentRow } from "./documentRows";
import UploadedBy from "./UploadedBy";

// What sits under a document's name in both layouts (table cell and card): who uploaded the
// current file, the buttons, and the history toggle. One `size` for everything, so all buttons
// in a row have the same height.
export default function DocumentRowControls({
  row,
  contractorId,
  canWrite,
  isActive,
  inactiveNoteId,
  size,
  onUpload,
}: {
  row: DocumentRow;
  contractorId: number;
  canWrite: boolean;
  isActive: boolean;
  inactiveNoteId: string;
  size: ButtonSize;
  onUpload: () => void;
}) {
  const { docType, document, historyCount } = row;
  return (
    <div className="flex flex-col gap-3">
      {document && <UploadedBy document={document} />}
      <DocumentActions
        document={document}
        canWrite={canWrite}
        isActive={isActive}
        inactiveNoteId={inactiveNoteId}
        size={size}
        onUpload={onUpload}
      />
      {historyCount > 0 && (
        <DocumentHistory contractorId={contractorId} docType={docType} count={historyCount} size={size} />
      )}
    </div>
  );
}
