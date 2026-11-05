import { CircleCheck, UserPlus, Wrench } from "lucide-react";
import { PRIORITIES, SR_STATUSES } from "../../api/serviceRequests";
import { useDashboard } from "../../hooks/useDashboard";
import { useLatestRequests, useRequestsByPriority } from "../../hooks/useDashboardLists";
import { SR_BASE } from "../../routes";
import { STATUS_DISPLAY } from "../Badges";
import { Chip, ChipLink } from "./Chip";
import DashboardHeader from "./DashboardHeader";
import KpiCard, { KpiGrid } from "./KpiCard";
import OverviewCard, { OverviewGrid } from "./OverviewCard";
import QueryState from "./QueryState";
import RequestList from "./RequestList";
import Section from "./Section";
import TopList from "./TopList";
import { priorityItems, statusItems, totalOf } from "./dashboardModel";

// Operations sees only the requests they created, and no invoice or document sections (the API
// sends those as null for them).
export default function OperationsDashboard() {
  const summary = useDashboard();
  const priorities = useRequestsByPriority();
  const latest = useLatestRequests();

  return (
    <>
      <DashboardHeader updatedAt={summary.dataUpdatedAt} />
      <Section title="Needs attention" subtitle="Your requests">
        <QueryState query={summary}>
          {({ sr_by_status: byStatus }) => (
            <KpiGrid columns={3}>
              <KpiCard
                to={`${SR_BASE}?status=open`}
                icon={UserPlus}
                tone={STATUS_DISPLAY.open.className}
                count={byStatus.open}
                label="Waiting for an engineer"
                clear="All requests have an engineer"
                chips={<Chip colors={STATUS_DISPLAY.open.className}>Not assigned yet</Chip>}
              />
              <KpiCard
                to={SR_BASE}
                icon={Wrench}
                tone={STATUS_DISPLAY.in_progress.className}
                count={byStatus.assigned + byStatus.in_progress}
                label="Being handled"
                clear="Nothing being handled"
                chips={
                  <>
                    {byStatus.assigned > 0 && (
                      <ChipLink to={`${SR_BASE}?status=assigned`} colors={STATUS_DISPLAY.assigned.className}>
                        {byStatus.assigned} Assigned
                      </ChipLink>
                    )}
                    {byStatus.in_progress > 0 && (
                      <ChipLink
                        to={`${SR_BASE}?status=in_progress`}
                        colors={STATUS_DISPLAY.in_progress.className}
                      >
                        {byStatus.in_progress} In progress
                      </ChipLink>
                    )}
                  </>
                }
              />
              <KpiCard
                to={`${SR_BASE}?status=resolved`}
                icon={CircleCheck}
                tone={STATUS_DISPLAY.resolved.className}
                count={byStatus.resolved}
                label="Resolved, waiting to close"
                clear="Nothing to follow up"
                wide
                chips={<Chip colors={STATUS_DISPLAY.resolved.className}>A manager closes it</Chip>}
              />
            </KpiGrid>
          )}
        </QueryState>
      </Section>

      <Section title="Overview" subtitle="Only requests you created">
        <OverviewGrid>
          <QueryState query={summary}>
            {({ sr_by_status: byStatus }) => (
              <OverviewCard
                title="My requests by status"
                meta={`${totalOf(byStatus, SR_STATUSES)} total`}
                items={statusItems(byStatus)}
              />
            )}
          </QueryState>
          <QueryState query={priorities}>
            {(counts) => (
              <OverviewCard
                title="My requests by priority"
                meta={`${totalOf(counts, PRIORITIES)} total`}
                items={priorityItems(counts)}
              />
            )}
          </QueryState>
        </OverviewGrid>
      </Section>

      <Section title="Latest" subtitle="Open a request to see its progress">
        <TopList
          title="My latest requests"
          meta={(page) => `Newest first · ${page.total}`}
          metaFallback="Newest first"
          viewAll={{ to: SR_BASE, label: "View all requests" }}
          query={latest}
          isEmpty={(page) => page.items.length === 0}
          empty={{ title: "No requests yet", text: "Create a request and it will appear here." }}
        >
          {(page, layout) => (
            <RequestList
              items={page.items}
              layout={layout}
              columns={{ status: true, engineer: true, created: true }}
            />
          )}
        </TopList>
      </Section>
    </>
  );
}
