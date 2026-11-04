import type { CurrentDocument } from "../../api/contractors";
import { formatRiyadhDate } from "../../utils/dates";
import { PersonName } from "../Avatar";

// "Avatar name · 3 Nov 2026": who uploaded the current file, and when.
export default function UploadedBy({ document }: { document: CurrentDocument }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-soft">
      <PersonName name={document.uploaded_by_name} />
      <span className="shrink-0">· {formatRiyadhDate(document.uploaded_at)}</span>
    </p>
  );
}
