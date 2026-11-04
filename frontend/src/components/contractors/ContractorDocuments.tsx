import { useId, useState } from "react";
import type { CurrentDocument } from "../../api/contractors";
import type { ControlSize } from "../formStyles";
import DocumentCards from "./DocumentCards";
import DocumentRowControls from "./DocumentRowControls";
import DocumentsTable from "./DocumentsTable";
import { documentRows, type DocumentRow } from "./documentRows";
import UploadDocumentDialog from "./UploadDocumentDialog";

// The documents of one contractor: a table (desktop, tablet) or stacked cards (mobile), and the
// upload / replace dialog both open. `size` is the one control size for everything below.
export default function ContractorDocuments({
  contractorId,
  documents,
  canWrite,
  isActive,
  mobile,
}: {
  contractorId: number;
  documents: CurrentDocument[];
  canWrite: boolean; // managers only; admins see everything but no Upload / Replace
  isActive: boolean; // the API refuses uploads to an inactive contractor
  mobile: boolean;
}) {
  const [uploading, setUploading] = useState<DocumentRow | null>(null);
  const inactiveNoteId = useId();
  const size: ControlSize = mobile ? "touch" : "md";
  const rows = documentRows(documents);

  const renderControls = (row: DocumentRow) => (
    <DocumentRowControls
      row={row}
      contractorId={contractorId}
      canWrite={canWrite}
      isActive={isActive}
      inactiveNoteId={inactiveNoteId}
      size={size}
      onUpload={() => setUploading(row)}
    />
  );

  return (
    <>
      {/* A disabled button must never be unexplained. */}
      {canWrite && !isActive && (
        <p id={inactiveNoteId} className="mb-3 text-sm text-ink-soft">
          Activate this contractor to upload or replace documents.
        </p>
      )}

      {mobile ? (
        <DocumentCards rows={rows} renderControls={renderControls} />
      ) : (
        <DocumentsTable rows={rows} renderControls={renderControls} />
      )}

      {uploading && (
        <UploadDocumentDialog
          contractorId={contractorId}
          docType={uploading.docType}
          isReplace={uploading.document !== undefined}
          size={size}
          onClose={() => setUploading(null)}
        />
      )}
    </>
  );
}
