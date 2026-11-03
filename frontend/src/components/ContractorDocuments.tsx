import { useState } from "react";
import {
  DOC_TYPES,
  DOC_TYPE_NAMES,
  type CurrentDocument,
  type DocType,
} from "../api/contractors";
import { useDocumentHistory } from "../hooks/useContractors";
import { formatDate, formatRiyadh } from "../utils/dates";
import { DocumentStatusBadge } from "./Badges";
import { buttonClass } from "./buttonStyles";
import DownloadButton from "./DownloadButton";
import { UploadIcon } from "./icons";
import UploadDocumentDialog from "./UploadDocumentDialog";

const COLUMNS = 6;

// The earlier uploads of one type. Nothing is fetched until the user opens it.
function History({
  contractorId,
  docType,
  count,
}: {
  contractorId: number;
  docType: DocType;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const query = useDocumentHistory(contractorId, docType, open);
  const older = query.data?.filter((document) => !document.is_current) ?? [];

  return (
    <div>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="text-xs font-medium text-gray-600 hover:text-gray-900"
      >
        {open ? "▾" : "▸"} History ({count})
      </button>
      {open && (
        <div className="mt-2">
          {query.isPending ? (
            <p className="text-xs text-gray-600">Loading…</p>
          ) : query.isError ? (
            <p role="alert" className="text-xs text-red-700">
              {query.error.message}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-gray-50">
              {older.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs">
                  <span className="font-medium text-gray-900">{document.original_filename}</span>
                  <span className="text-gray-700">Expiry {formatDate(document.expiry_date)}</span>
                  <DocumentStatusBadge status={document.status} daysLeft={document.days_left} />
                  <span className="text-gray-600">
                    {document.uploaded_by_name}, {formatRiyadh(document.uploaded_at)}
                  </span>
                  <DownloadButton documentId={document.id} filename={document.original_filename} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Always the five fixed document types, in order, whether or not a file was uploaded.
export default function ContractorDocuments({
  contractorId,
  documents,
  canWrite,
  isActive,
}: {
  contractorId: number;
  documents: CurrentDocument[];
  canWrite: boolean; // managers only; admins see everything but no buttons
  isActive: boolean; // the API refuses uploads to an inactive contractor
}) {
  const [uploading, setUploading] = useState<DocType | null>(null);
  const byType = new Map(documents.map((document) => [document.doc_type, document]));

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Document</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">File</th>
              <th className="px-3 py-2">Uploaded</th>
              {canWrite && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          {DOC_TYPES.map((docType) => {
            const document = byType.get(docType);
            const historyCount = document ? document.upload_count - 1 : 0;
            return (
              <tbody key={docType} className="border-t border-gray-200">
                <tr>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{DOC_TYPE_NAMES[docType]}</div>
                    <div className="text-xs text-gray-500">{docType}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {document ? (
                      <DocumentStatusBadge status={document.status} daysLeft={document.days_left} />
                    ) : (
                      <DocumentStatusBadge status="missing" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                    {document ? formatDate(document.expiry_date) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {document ? (
                      <DownloadButton documentId={document.id} filename={document.original_filename} />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">
                    {document ? (
                      <>
                        <div>{document.uploaded_by_name}</div>
                        <div>{formatRiyadh(document.uploaded_at)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  {canWrite && (
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        onClick={() => setUploading(docType)}
                        disabled={!isActive}
                        title={isActive ? undefined : "Reactivate this contractor to upload"}
                        className={`${buttonClass("outline-neutral", "sm")} inline-flex items-center gap-1.5`}
                      >
                        <UploadIcon />
                        {document ? "Replace" : "Upload"}
                      </button>
                    </td>
                  )}
                </tr>
                {historyCount > 0 && (
                  <tr>
                    <td colSpan={canWrite ? COLUMNS : COLUMNS - 1} className="px-3 pb-2">
                      <History contractorId={contractorId} docType={docType} count={historyCount} />
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>

      {uploading && (
        <UploadDocumentDialog
          contractorId={contractorId}
          docType={uploading}
          isReplace={byType.has(uploading)}
          onClose={() => setUploading(null)}
        />
      )}
    </>
  );
}
