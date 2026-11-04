import { useParams } from "react-router-dom";
import { useAuditEntry } from "../../hooks/useAuditLog";
import { useListLinks } from "../../hooks/useListLinks";
import { AUDIT_BASE } from "../../routes";
import { fromQuery } from "../detail/detailStatus";
import DetailShell from "../detail/DetailShell";
import DetailState from "../detail/DetailState";
import AuditDetailBody from "./AuditDetailBody";

// The element of /audit-log/:id. It loads the entry by id (so a refreshed deep link works even
// when the entry is not on the loaded list page) and hands the shell the pieces.
export default function AuditDetailRoute() {
  const id = Number(useParams().id);
  const { listPath } = useListLinks(AUDIT_BASE);
  const status = fromQuery(useAuditEntry(id));

  return (
    <DetailShell
      aria-label={`Audit entry #${id}`}
      width={520}
      storageKey="srct.panelWidth.audit"
      list={{ label: "Audit Log", path: listPath }}
      title={`#${id}`}
      mobileTitle={`Audit #${id}`}
    >
      {({ mobile }) => (
        <DetailState status={status} notFoundText="Audit entry not found">
          {(row) => <AuditDetailBody key={row.id} row={row} mobile={mobile} />}
        </DetailState>
      )}
    </DetailShell>
  );
}
