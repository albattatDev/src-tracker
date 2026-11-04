import type { ReactNode } from "react";
import { DOC_TYPE_NAMES } from "../../api/contractors";
import { formatDate } from "../../utils/dates";
import { DocumentStatusBadge } from "../Badges";
import type { DocumentRow } from "./documentRows";

const TH = "h-10 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted";

// Desktop and tablet: the five fixed document rows as a table. `renderControls` draws what sits
// under each name (uploader, buttons, history), see DocumentRowControls.
export default function DocumentsTable({
  rows,
  renderControls,
}: {
  rows: DocumentRow[];
  renderControls: (row: DocumentRow) => ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas">
          <tr className="border-b border-line">
            <th className={TH}>Document</th>
            <th className={`${TH} w-40`}>Status</th>
            <th className={`${TH} w-32`}>Expiry</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.docType} className="align-top">
              <td className="px-4 py-3">
                <div className="font-medium">{DOC_TYPE_NAMES[row.docType]}</div>
                <div className="text-sm text-muted">{row.docType}</div>
                <div className="mt-3">{renderControls(row)}</div>
              </td>
              <td className="px-4 py-3">
                <DocumentStatusBadge status={row.status} />
                {row.note && <p className="mt-1.5 text-sm text-muted">{row.note}</p>}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {row.document ? formatDate(row.document.expiry_date) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
