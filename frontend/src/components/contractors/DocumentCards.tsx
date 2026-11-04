import type { ReactNode } from "react";
import { DOC_TYPE_NAMES } from "../../api/contractors";
import { formatDate } from "../../utils/dates";
import { DocumentStatusBadge } from "../Badges";
import type { DocumentRow } from "./documentRows";

// Mobile: the five fixed document rows as stacked cards. `renderControls` draws what sits under
// each name (uploader, buttons, history), see DocumentRowControls.
export default function DocumentCards({
  rows,
  renderControls,
}: {
  rows: DocumentRow[];
  renderControls: (row: DocumentRow) => ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.docType} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{DOC_TYPE_NAMES[row.docType]}</p>
              <p className="text-sm text-muted">{row.docType}</p>
            </div>
            <DocumentStatusBadge status={row.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {[row.note, row.document && `Expires ${formatDate(row.document.expiry_date)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-3">{renderControls(row)}</div>
        </li>
      ))}
    </ul>
  );
}
