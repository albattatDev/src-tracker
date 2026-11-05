import { Link } from "react-router-dom";
import { useProblemContractors } from "../../hooks/useDashboardLists";
import { CONTRACTORS_BASE } from "../../routes";
import { DocumentCountChip } from "../Badges";
import TopList from "./TopList";

// Contractors with an expired or expiring document, expired first. There is no endpoint that
// lists documents across contractors, so each row is a contractor with its counts, linking to
// the contractor (whose page lists the documents).
export default function ProblemDocuments() {
  const query = useProblemContractors();

  return (
    <TopList
      title="Documents to act on"
      meta={(data) => `Expired first · ${data.needAction}`}
      metaFallback="Expired first"
      viewAll={{ to: CONTRACTORS_BASE, label: "View contractors" }}
      query={query}
      isEmpty={(data) => data.items.length === 0}
      empty={{
        title: "No documents need action",
        text: "Contractors with an expired or expiring document will appear here.",
      }}
    >
      {(data, layout) => (
        <ul className={layout === "cards" ? "flex flex-col gap-3" : "divide-y divide-line"}>
          {data.items.map((contractor) => (
            <li
              key={contractor.id}
              className={layout === "cards" ? "rounded-card border border-line bg-surface" : undefined}
            >
              <Link
                to={`${CONTRACTORS_BASE}/${contractor.id}`}
                className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-canvas md:px-5 ${
                  layout === "cards" ? "rounded-card" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{contractor.name}</span>
                  <span className="block truncate text-ink-soft">
                    Manager: {contractor.internal_manager_name}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {contractor.doc_counts.expired > 0 && (
                    <DocumentCountChip status="expired" count={contractor.doc_counts.expired} />
                  )}
                  {contractor.doc_counts.expiring_soon > 0 && (
                    <DocumentCountChip status="expiring_soon" count={contractor.doc_counts.expiring_soon} />
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </TopList>
  );
}
