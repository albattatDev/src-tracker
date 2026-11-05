import { Play, Receipt, Wrench } from "lucide-react";
import type { DashboardOut } from "../../api/dashboard";
import { useDashboard } from "../../hooks/useDashboard";
import { useMyOpenRequests } from "../../hooks/useDashboardLists";
import { INVOICES_BASE, SR_BASE } from "../../routes";
import { AGING_DISPLAY, STATUS_DISPLAY } from "../Badges";
import BandChips from "./BandChips";
import { Chip } from "./Chip";
import DashboardHeader from "./DashboardHeader";
import KpiCard, { KpiGrid } from "./KpiCard";
import OverviewCard, { OverviewGrid } from "./OverviewCard";
import PendingInvoiceList from "./PendingInvoiceList";
import QueryState from "./QueryState";
import RequestList from "./RequestList";
import StatusAction from "./StatusAction";
import Section from "./Section";
import TopList from "./TopList";
import { bandItems, hasSection, pendingTotal, statusItems, worstBand } from "./dashboardModel";

// An engineer's own work: what to start, what is under way, and which invoices wait.
export default function EngineerDashboard() {
  const summary = useDashboard();
  const hasInvoices = hasSection(summary.data, "invoices_by_band");

  return (
    <>
      <DashboardHeader updatedAt={summary.dataUpdatedAt} />
      <QueryState query={summary}>{(data) => <EngineerSummary data={data} />}</QueryState>

      <Section title="Top items" subtitle="Update the request, or add its invoice">
        <div className="flex flex-col gap-4">
          <MyOpenRequests />
          {hasInvoices && <PendingInvoiceList title="My pending invoices" canDecide={false} />}
        </div>
      </Section>
    </>
  );
}

function EngineerSummary({ data }: { data: DashboardOut }) {
  const { sr_by_status: byStatus, invoices_by_band: bands } = data;
  const pending = bands ? pendingTotal(bands) : 0;
  const active = byStatus.assigned + byStatus.in_progress;

  return (
    <>
      <Section title="Needs attention" subtitle="Your work today">
        <KpiGrid columns={3}>
          <KpiCard
            to={`${SR_BASE}?status=assigned`}
            icon={Play}
            tone={STATUS_DISPLAY.assigned.className}
            count={byStatus.assigned}
            label="Waiting for me to start"
            clear="Nothing waiting"
            chips={<Chip colors={STATUS_DISPLAY.assigned.className}>Start when ready</Chip>}
          />
          <KpiCard
            to={`${SR_BASE}?status=in_progress`}
            icon={Wrench}
            tone={STATUS_DISPLAY.in_progress.className}
            count={byStatus.in_progress}
            label="In progress"
            clear="Nothing in progress"
            chips={<Chip colors={STATUS_DISPLAY.in_progress.className}>Resolve when done</Chip>}
          />
          {bands && (
            <KpiCard
              wide
              to={`${INVOICES_BASE}?status=pending`}
              icon={Receipt}
              tone={AGING_DISPLAY[worstBand(bands) ?? "green"].className}
              count={pending}
              label="My pending invoices"
              clear="No pending invoices"
              chips={<BandChips bands={bands} />}
            />
          )}
        </KpiGrid>
      </Section>

      <Section title="Overview" subtitle="Only the requests assigned to you">
        <OverviewGrid>
          <OverviewCard
            title="My requests"
            meta={`${active} active`}
            items={statusItems(byStatus, ["assigned", "in_progress", "resolved", "closed"])}
          />
          {bands && (
            <OverviewCard
              title="My pending invoices by age"
              meta={`${pending} pending`}
              items={bandItems(bands)}
            />
          )}
        </OverviewGrid>
      </Section>
    </>
  );
}

// In progress first, then assigned (oldest first), with the one next step as a button.
function MyOpenRequests() {
  const query = useMyOpenRequests();
  return (
    <TopList
      title="My open requests"
      meta={(data) => `${data.total} ${data.total === 1 ? "request" : "requests"}`}
      viewAll={{ to: SR_BASE, label: "View requests" }}
      query={query}
      isEmpty={(data) => data.items.length === 0}
      empty={{ title: "Nothing to work on", text: "Requests assigned to you will appear here." }}
    >
      {(data, layout) => (
        <RequestList
          items={data.items}
          layout={layout}
          columns={{ requester: true, status: true }}
          renderAction={(sr) => <StatusAction sr={sr} layout={layout} />}
        />
      )}
    </TopList>
  );
}
