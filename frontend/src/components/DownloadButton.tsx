import { useState } from "react";
import { downloadDocument } from "../api/contractors";

// Downloads through fetch + blob because the JWT is sent in a header. Shows its own error,
// so one failed download does not disturb the rest of the page.
export default function DownloadButton({
  documentId,
  filename,
}: {
  documentId: number;
  filename: string;
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
        onClick={download}
        disabled={busy}
        aria-label={`Download ${filename}`}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
      >
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
