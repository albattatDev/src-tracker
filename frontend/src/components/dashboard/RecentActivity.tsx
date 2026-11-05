import { useAuth } from "../../hooks/useAuth";
import { useRecentActivity } from "../../hooks/useDashboardLists";
import { AUDIT_BASE } from "../../routes";
import AuditLogCards from "../audit/AuditLogCards";
import AuditLogTable from "../audit/AuditLogTable";
import TopList from "./TopList";

// The latest audit entries, with the audit page's own table and cards (the table without its
// own border: the panel draws it).
export default function RecentActivity() {
  const query = useRecentActivity();
  const { user } = useAuth();

  return (
    <TopList
      title="Recent activity"
      meta={(page) => `Across the system · ${page.items.length}`}
      metaFallback="Across the system"
      viewAll={{ to: AUDIT_BASE, label: "View audit log" }}
      query={query}
      isEmpty={(page) => page.items.length === 0}
      empty={{ title: "No activity yet", text: "Changes made in the system will appear here." }}
    >
      {(page, layout) =>
        layout === "cards" ? (
          <AuditLogCards items={page.items} dimmed={false} />
        ) : (
          <AuditLogTable
            items={page.items}
            role={user?.role}
            wide={false}
            selectedId={undefined}
            dimmed={false}
            framed={false}
          />
        )
      }
    </TopList>
  );
}
