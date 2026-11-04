import { Upload } from "lucide-react";
import type { CurrentDocument } from "../../api/contractors";
import { buttonClass, type ButtonSize } from "../buttonStyles";
import DownloadButton from "./DownloadButton";

// The buttons of one document row, always with a text label: Download and Replace file when a
// file exists, Upload file when it is missing. Everyone who sees the page may download; only
// managers (`canWrite`) see Upload / Replace, and they are disabled while the contractor is
// inactive (the API refuses uploads then). `inactiveNoteId` is the line that explains why.
export default function DocumentActions({
  document,
  canWrite,
  isActive,
  inactiveNoteId,
  size,
  onUpload,
}: {
  document: CurrentDocument | undefined;
  canWrite: boolean;
  isActive: boolean;
  inactiveNoteId: string;
  size: ButtonSize;
  onUpload: () => void;
}) {
  if (!document && !canWrite) return null;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {document && (
        <DownloadButton documentId={document.id} filename={document.original_filename} size={size} />
      )}
      {canWrite && (
        <button
          type="button"
          onClick={onUpload}
          disabled={!isActive}
          aria-describedby={isActive ? undefined : inactiveNoteId}
          className={buttonClass("secondary", size)}
        >
          <Upload size={16} strokeWidth={2} aria-hidden="true" />
          {document ? "Replace file" : "Upload file"}
        </button>
      )}
    </div>
  );
}
