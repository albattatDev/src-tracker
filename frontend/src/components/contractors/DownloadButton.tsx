import { useState } from "react";
import { Download } from "lucide-react";
import { downloadDocument } from "../../api/contractors";
import { buttonClass, type ButtonSize } from "../buttonStyles";

// Downloads through fetch + blob because the JWT is sent in a header. Shows its own error,
// so one failed download does not disturb the rest of the page.
export default function DownloadButton({
  documentId,
  filename,
  size,
}: {
  documentId: number;
  filename: string;
  size: ButtonSize;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadDocument(documentId, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        aria-label={`Download ${filename}`}
        className={buttonClass("secondary", size)}
      >
        <Download size={16} strokeWidth={2} aria-hidden="true" />
        {busy ? "Downloading…" : "Download"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
