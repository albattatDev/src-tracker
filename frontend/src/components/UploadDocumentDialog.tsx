import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  ALLOWED_EXTENSIONS,
  DOC_TYPES,
  DOC_TYPE_NAMES,
  MAX_UPLOAD_BYTES,
  type DocType,
} from "../api/contractors";
import { useUploadDocument } from "../hooks/useContractors";
import { buttonClass } from "./buttonStyles";
import FileDropzone, { type DropzoneStatus } from "./FileDropzone";
import Modal from "./Modal";
import Select from "./Select";

const CONTROL =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:opacity-50";

// How long "Completed" stays visible before the dialog closes.
const COMPLETED_CLOSE_DELAY_MS = 900;

// A quick check so the user hears about a bad file before it uploads. The server checks
// again (extension, file content and size) and is the authority.
function fileProblem(file: File | null): string | null {
  if (!file) return null;
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return "Only PDF, JPG and PNG files are allowed";
  }
  if (file.size === 0) return "The file is empty";
  if (file.size > MAX_UPLOAD_BYTES) return "The file is larger than 10 MB";
  return null;
}

export default function UploadDocumentDialog({
  contractorId,
  docType: initialType,
  isReplace,
  onClose,
}: {
  contractorId: number;
  docType: DocType; // preselected from the row the user clicked
  isReplace: boolean;
  onClose: () => void;
}) {
  const fileInputId = useId();
  const [docType, setDocType] = useState<DocType>(initialType);
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const upload = useUploadDocument(contractorId);

  // The dialog's own close paths (Escape, backdrop, Cancel, auto-close) all end by unmounting
  // it, so aborting here is what makes "closing during an upload cancels it" true for all.
  useEffect(() => () => controller.current?.abort(), []);

  // The timer below must not restart every time the parent re-renders with a new onClose.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const uploading = upload.isPending;
  const completed = upload.isSuccess;
  useEffect(() => {
    if (!completed) return;
    const timer = setTimeout(() => onCloseRef.current(), COMPLETED_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completed]);

  const problem = fileProblem(file);
  // The user pressing X is not a failure: the file stays selected, ready to try again.
  const cancelled = upload.error?.name === "AbortError";
  const fieldErrors = upload.error instanceof ApiError ? upload.error.fieldErrors : {};
  // A 422 about the form fields is shown under those fields. The file itself did nothing wrong.
  const failure =
    upload.isError && !cancelled && Object.keys(fieldErrors).length === 0 ? upload.error : null;

  const status: DropzoneStatus = problem
    ? { kind: "failed", message: problem }
    : uploading
      ? { kind: "uploading", progress }
      : completed
        ? { kind: "completed" }
        : failure
          ? { kind: "failed", message: failure.message }
          : { kind: "ready" };

  const locked = uploading || completed;
  const canSubmit = file !== null && problem === null && expiry !== "" && !locked;

  function chooseFile(next: File) {
    setFile(next);
    setProgress(0);
    upload.reset(); // an old error or "Completed" belongs to the previous file
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !canSubmit) return;
    const abort = new AbortController();
    controller.current = abort;
    setProgress(0);
    upload.mutate({
      data: { doc_type: docType, expiry_date: expiry, file },
      onProgress: setProgress,
      signal: abort.signal,
    });
  }

  return (
    <Modal title={`${isReplace ? "Replace" : "Upload"} ${DOC_TYPE_NAMES[initialType]}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Document type
          <Select
            value={docType}
            disabled={locked}
            onChange={(e) => setDocType(e.target.value as DocType)}
            className={CONTROL}
          >
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {type} · {DOC_TYPE_NAMES[type]}
              </option>
            ))}
          </Select>
          {fieldErrors.doc_type && <span className="font-normal text-red-700">{fieldErrors.doc_type}</span>}
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Expiry date
          <input
            required
            type="date"
            value={expiry}
            disabled={locked}
            onChange={(e) => setExpiry(e.target.value)}
            className={`pr-3 ${CONTROL}`}
          />
          {fieldErrors.expiry_date && <span className="font-normal text-red-700">{fieldErrors.expiry_date}</span>}
        </label>

        <FileDropzone
          id={fileInputId}
          accept={ALLOWED_EXTENSIONS.join(",")}
          file={file}
          status={status}
          onFile={chooseFile}
          onCancelUpload={() => controller.current?.abort()}
        />

        {isReplace && (
          <p className="text-xs text-gray-600">The current file stays in this document's history.</p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading…" : isReplace ? "Replace" : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
