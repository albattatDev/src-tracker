import { FileText, Image } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { formatFileSize } from "../utils/fileSize";
import { buttonClass } from "./buttonStyles";
import { LABEL, type ControlSize } from "./formStyles";

// What the file card says. The caller works it out (it knows about the upload and the checks);
// this component only draws it.
export type DropzoneStatus =
  | { kind: "ready" }
  | { kind: "uploading"; progress: number } // 0 to 100
  | { kind: "completed" }
  | { kind: "failed"; message: string };

const HIGHLIGHT = "border-ink bg-fill";

// A single-file picker: an empty drop box, which becomes a card for the chosen file. The file
// can come from a drop or from the OS dialog (Browse files / Replace). It never uploads on its
// own: it only calls onFile, and the form decides when to send.
export default function FileDropzone({
  id,
  accept,
  size,
  file,
  status,
  onFile,
  onCancelUpload,
}: {
  id: string; // ties the "File" label to the hidden input
  accept: string; // for the OS dialog, e.g. ".pdf,.jpg,.jpeg,.png"
  size: ControlSize; // label and button size: touch (44px buttons) on mobile
  file: File | null;
  status: DropzoneStatus;
  onFile: (file: File) => void;
  onCancelUpload: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // While a file is uploading (or done), it must not be swapped.
  const canPick = file === null || status.kind === "ready" || status.kind === "failed";

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    // Cleared first, so choosing the same file again still counts as a change.
    input.value = "";
    input.click();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // Cancelling the OS dialog leaves no file: keep the current one.
    const picked = event.target.files?.[0];
    if (picked) onFile(picked);
  }

  // preventDefault on every drag event is what stops the browser from opening the dropped file.
  const dragHandlers = {
    onDragEnter(event: DragEvent) {
      event.preventDefault();
      if (canPick) setDragging(true);
    },
    onDragOver(event: DragEvent) {
      event.preventDefault();
      event.dataTransfer.dropEffect = canPick ? "copy" : "none";
      if (canPick) setDragging(true);
    },
    onDragLeave(event: DragEvent) {
      // Moving onto a child of the box also fires dragleave; only clear when truly leaving.
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop(event: DragEvent) {
      event.preventDefault();
      setDragging(false);
      if (!canPick) return;
      const dropped = event.dataTransfer.files[0]; // several files: only the first is used
      if (dropped) onFile(dropped);
    },
  };

  return (
    <div>
      <label htmlFor={id} className={`mb-1.5 block ${LABEL[size]}`}>
        File
      </label>
      {/* Hidden, not removed: the buttons below open it. tabIndex -1 because "Browse files" /
          "Replace" are the keyboard route, so it is not a second tab stop. */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={!canPick}
        tabIndex={-1}
        className="sr-only"
      />

      {file === null ? (
        <div
          {...dragHandlers}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center ${
            dragging ? HIGHLIGHT : "border-line-strong bg-surface"
          }`}
        >
          <FileText className="size-8 text-muted" />
          <p className="text-sm font-medium text-ink">Drag and drop a file here</p>
          <p className="text-xs text-muted">PDF, JPG, PNG up to 10 MB</p>
          <button type="button" onClick={openPicker} className={buttonClass("secondary", size)}>
            Browse files
          </button>
        </div>
      ) : (
        <FileCard
          file={file}
          size={size}
          status={status}
          dragging={dragging}
          dragHandlers={dragHandlers}
          onReplace={openPicker}
          onCancelUpload={onCancelUpload}
        />
      )}
    </div>
  );
}

function FileCard({
  file,
  size,
  status,
  dragging,
  dragHandlers,
  onReplace,
  onCancelUpload,
}: {
  file: File;
  size: ControlSize;
  status: DropzoneStatus;
  dragging: boolean;
  dragHandlers: Record<string, (event: DragEvent) => void>;
  onReplace: () => void;
  onCancelUpload: () => void;
}) {
  const isImage = /\.(jpe?g|png)$/i.test(file.name);
  const Icon = isImage ? Image : FileText;
  const border = dragging
    ? HIGHLIGHT
    : status.kind === "failed"
      ? "border-red-200 bg-red-50"
      : "border-line bg-surface";

  return (
    <div {...dragHandlers} className={`flex items-start gap-3 rounded-xl border p-3 ${border}`}>
      <Icon className="size-8 shrink-0 text-muted" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-ink-soft" aria-live="polite">
          {formatFileSize(file.size)} ·{" "}
          {status.kind === "ready" && "Ready to upload"}
          {status.kind === "uploading" && "Uploading…"}
          {status.kind === "completed" && <span className="font-medium text-green-700">Completed</span>}
          {status.kind === "failed" && <span className="font-medium text-red-700">Failed</span>}
        </p>
        {status.kind === "failed" && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {status.message}
          </p>
        )}
        {status.kind === "uploading" && (
          <div className="mt-2 flex items-center gap-2">
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={status.progress}
              className="h-2 flex-1 overflow-hidden rounded-full bg-line"
            >
              <div className="h-full bg-ink transition-[width]" style={{ width: `${status.progress}%` }} />
            </div>
            <span className="w-9 text-right text-xs tabular-nums text-ink-soft">{status.progress}%</span>
          </div>
        )}
      </div>

      {(status.kind === "ready" || status.kind === "failed") && (
        <button type="button" onClick={onReplace} className={buttonClass("secondary", size)}>
          Replace
        </button>
      )}
      {status.kind === "uploading" && (
        <button
          type="button"
          onClick={onCancelUpload}
          aria-label="Cancel upload"
          className={buttonClass("secondary", size)}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
