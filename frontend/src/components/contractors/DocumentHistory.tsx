import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DocType } from "../../api/contractors";
import { useDocumentHistory } from "../../hooks/useContractors";
import type { ButtonSize } from "../buttonStyles";
import { formatRiyadhDate } from "../../utils/dates";
import DownloadButton from "./DownloadButton";

// The earlier uploads of one type. Nothing is fetched until the user opens it.
export default function DocumentHistory({
  contractorId,
  docType,
  count,
  size,
}: {
  contractorId: number;
  docType: DocType;
  count: number;
  size: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  const query = useDocumentHistory(contractorId, docType, open);
  const older = query.data?.filter((document) => !document.is_current) ?? [];
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`-ml-1 inline-flex items-center gap-1 rounded-field px-1 text-sm text-ink-soft hover:text-ink ${
          size === "touch" ? "min-h-11" : "min-h-8"
        }`}
      >
        <Chevron size={16} strokeWidth={2} aria-hidden="true" />
        History ({count})
      </button>
      {open && (
        <div className="mt-1">
          {query.isPending ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : query.isError ? (
            <p role="alert" className="text-sm text-red-700">
              {query.error.message}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {older.map((document) => (
                <li key={document.id} className="rounded-field bg-canvas p-2 text-sm text-ink-soft">
                  <p>
                    Previous file · uploaded {formatRiyadhDate(document.uploaded_at)} by{" "}
                    {document.uploaded_by_name}
                  </p>
                  <div className="mt-2">
                    <DownloadButton
                      documentId={document.id}
                      filename={document.original_filename}
                      size={size}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
