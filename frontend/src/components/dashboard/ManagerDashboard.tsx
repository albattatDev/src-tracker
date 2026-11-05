import { Clock, Receipt, ShieldAlert, UserPlus } from "lucide-react";
import type { DashboardOut } from "../../api/dashboard";
import { SR_STATUSES } from "../../api/serviceRequests";
import { useAuth } from "../../hooks/useAuth";
import { useDashboard } from "../../hooks/useDashboard";
import { useProblemContractors, useUnassignedRequests } from "../../hooks/useDashboardLists";
import { CONTRACTORS_BASE, INVOICES_BASE, SR_BASE } from "../../routes";
import { canDecideInvoices } from "../../utils/permissions";
import AssignControl from "../serviceRequests/AssignControl";
import AssignSheetTrigger from "../serviceRequests/AssignSheetTrigger";
import { AGING_DISPLAY, DOCUMENT_STATUS_DISPLAY, STATUS_DISPLAY } from "../Badges";
import BandChips from "./BandChips";
import { Chip } from "./Chip";
import DashboardHeader from "./DashboardHeader";
import KpiCard, { KpiGrid } from "./KpiCard";
import OverviewCard, { OverviewGrid } from "./OverviewCard";
import PendingInvoiceList from "./PendingInvoiceList";
import ProblemDocuments from "./ProblemDocuments";
import QueryState from "./QueryState";
import RequestList from "./RequestList";
import Section from "./Section";
import TopList from "./TopList";
import { bandItems, hasSection, pendingTotal, statusItems, totalOf } from "./dashboardModel";

// What a manager must decide: overdue invoices, requests nobody has taken, and contractor
// documents that are expired or about to be.
export default function ManagerDashboard() {
  const summary = useDashboard();
  const { user } = useAuth();
  const hasInvoices = hasSection(summary.data, "invoices_by_band");
  const hasDocuments = hasSection(summary.data, "documents");

  return (
    <>
      <DashboardHeader updatedAt={summary.dataUpdatedAt} />
      <QueryState query={summary}>{(data) => <ManagerSummary data={data} />}</QueryState>

      <Section title="Top items" subtitle="The five most urgent in each list">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            {hasInvoices && (
              <PendingInvoiceList title="Invoices to review" canDecide={canDecideInvoices(user?.role)} />
            )}
            <UnassignedRequests />
          </div>
          {hasDocuments && <ProblemDocuments />}
        </div>
      </Section>
    </>
  );
}

function ManagerSummary({ data }: { data: DashboardOut }) {
  const { sr_by_status: byStatus, invoices_by_band: bands, documents } = data;
  const contractors = useProblemContractors(documents !== null);
  const affected = contractors.data?.affected ?? 0;
  // The card counts every pending invoice, the same rows its link (?status=pending) lists. Its
  // chips pick out the late ones (Critical and Overdue).
  const pending = bands ? pendingTotal(bands) : 0;

  return (
    <>
      <Section title="Needs attention" subtitle="Decisions waiting for you">
        <KpiGrid columns={4}>
          {bands && (
            <KpiCard
              to={`${INVOICES_BASE}?status=pending`}
              icon={Receipt}
              tone={AGING_DISPLAY.red.className}
              count={pending}
              label="Invoices to review"
              clear="Nothing to review"
              chips={<BandChips bands={bands} only={["red", "orange"]} />}
            />
          )}
          <KpiCard
            to={`${SR_BASE}?status=open`}
            icon={UserPlus}
            tone={STATUS_DISPLAY.open.className}
            count={byStatus.open}
            label="Unassigned requests"
            clear="Every request has an engineer"
            chips={<Chip colors={STATUS_DISPLAY.open.className}>Needs an engineer</Chip>}
          />
          {documents && (
            <>
              <KpiCard
                to={CONTRACTORS_BASE}
                icon={ShieldAlert}
                tone={DOCUMENT_STATUS_DISPLAY.expired.className}
                count={documents.expired}
                label="Expired documents"
                clear="No expired documents"
                chips={
                  <Chip colors={DOCUMENT_STATUS_DISPLAY.expired.className}>
                    {affected > 0
                      ? `${affected} ${affected === 1 ? "contractor" : "contractors"} affected`
                      : "Act now"}
                  </Chip>
                }
              />
              <KpiCard
                to={CONTRACTORS_BASE}
                icon={Clock}
                tone={DOCUMENT_STATUS_DISPLAY.expiring_soon.className}
                count={documents.expiring_soon}
                label="Documents expiring soon"
                clear="Nothing expiring soon"
                chips={<Chip colors={DOCUMENT_STATUS_DISPLAY.expiring_soon.className}>Within 30 days</Chip>}
              />
            </>
          )}
        </KpiGrid>
      </Section>

      <Section title="Overview" subtitle="Where everything stands">
        <OverviewGrid>
          <OverviewCard
            title="Service requests"
            meta={`${totalOf(byStatus, SR_STATUSES)} total`}
            items={statusItems(byStatus)}
          />
          {bands && (
            <OverviewCard title="Pending invoices by age" meta={`${pending} pending`} items={bandItems(bands)} />
          )}
        </OverviewGrid>
      </Section>
    </>
  );
}

// Open requests, oldest first, each with the engineer picker.
function UnassignedRequests() {
  const query = useUnassignedRequests();
  return (
    <TopList
      title="Unassigned requests"
      meta={(page) => `Waiting for an engineer · ${page.total}`}
      metaFallback="Waiting for an engineer"
      viewAll={{ to: `${SR_BASE}?status=open`, label: "View requests" }}
      query={query}
      isEmpty={(page) => page.items.length === 0}
      empty={{
        title: "No requests are waiting",
        text: "New requests from Operations will appear here with an Assign button.",
      }}
    >
      {(page, layout) => (
        <RequestList
          items={page.items}
          layout={layout}
          columns={{ created: true }}
          actionHeader="Assign"
          renderAction={(sr) =>
            layout === "table" ? <AssignControl sr={sr} /> : <AssignSheetTrigger sr={sr} />
          }
        />
      )}
    </TopList>
  );
}
