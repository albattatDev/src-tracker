import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import {
  ALLOWED_EXTENSIONS,
  DOC_TYPE_NAMES,
  MAX_UPLOAD_BYTES,
  type DocType,
} from "../../api/contractors";
import { useUploadDocument } from "../../hooks/useContractors";
import { buttonClass } from "../buttonStyles";
import FileDropzone, { type DropzoneStatus } from "../FileDropzone";
import { CONTROL, LABEL, type ControlSize } from "../formStyles";
import Modal from "../Modal";
import { useToast } from "../Toast";

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

// Upload (type has no file yet) or Replace (the current file moves to history). The document
// type is the row the user clicked: shown, not changeable.
export default function UploadDocumentDialog({
  contractorId,
  docType,
  isReplace,
  size,
  onClose,
}: {
  contractorId: number;
  docType: DocType;
  isReplace: boolean;
  size: ControlSize; // control and button size; the dialog is a Modal on every screen
  onClose: () => void;
}) {
  const fileInputId = useId();
  const toast = useToast();
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
  // The user pressing Cancel is not a failure: the file stays selected, ready to try again.
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
    upload.mutate(
      {
        data: { doc_type: docType, expiry_date: expiry, file },
        onProgress: setProgress,
        signal: abort.signal,
      },
      {
        onSuccess: () =>
          toast.show(`${DOC_TYPE_NAMES[docType]} ${isReplace ? "replaced" : "uploaded"}`),
      }
    );
  }

  return (
    <Modal title={isReplace ? "Replace file" : "Upload file"} width="lg" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className={`flex flex-col gap-1.5 ${LABEL[size]}`}>
          Document
          <p className="text-base font-normal text-ink md:text-sm">
            {DOC_TYPE_NAMES[docType]} <span className="text-muted">({docType})</span>
          </p>
          {fieldErrors.doc_type && <span className="font-normal text-red-700">{fieldErrors.doc_type}</span>}
        </div>
        <label className={`flex flex-col gap-1.5 ${LABEL[size]}`}>
          Expiry date
          <input
            required
            type="date"
            value={expiry}
            disabled={locked}
            onChange={(e) => setExpiry(e.target.value)}
            className={`w-full disabled:cursor-not-allowed disabled:bg-fill disabled:text-muted ${CONTROL[size]}`}
          />
          {fieldErrors.expiry_date && <span className="font-normal text-red-700">{fieldErrors.expiry_date}</span>}
        </label>

        <FileDropzone
          id={fileInputId}
          accept={ALLOWED_EXTENSIONS.join(",")}
          size={size}
          file={file}
          status={status}
          onFile={chooseFile}
          onCancelUpload={() => controller.current?.abort()}
        />

        {isReplace && <p className="text-sm text-ink-soft">The current file stays in history.</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary", size)}>
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className={buttonClass("primary", size)}>
            {uploading ? "Uploading…" : isReplace ? "Replace file" : "Upload file"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
