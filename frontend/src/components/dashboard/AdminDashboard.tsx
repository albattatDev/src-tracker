import { ShieldAlert, UserPlus, Users } from "lucide-react";
import { USER_ROLES } from "../../api/users";
import { useDashboardUsers } from "../../hooks/useDashboardLists";
import { USERS_BASE } from "../../routes";
import { ACTIVE_DISPLAY, AGING_DISPLAY, ROLE_DISPLAY } from "../Badges";
import { ChipLink } from "./Chip";
import DashboardHeader from "./DashboardHeader";
import KpiCard, { KpiGrid } from "./KpiCard";
import OverviewCard, { OverviewGrid } from "./OverviewCard";
import QueryState from "./QueryState";
import RecentActivity from "./RecentActivity";
import Section from "./Section";
import { managerItems, roleChipLabel, roleItems } from "./dashboardModel";
import { summarizeUsers } from "./summarizeUsers";

// People and access, counted from GET /users (see summarizeUsers; the Users page has no
// filters, so every link goes to the unfiltered page), and the latest activity from the audit
// log. Admin has no /dashboard numbers: the cards are driven by the users query.
export default function AdminDashboard() {
  const users = useDashboardUsers();

  return (
    <>
      <DashboardHeader updatedAt={users.dataUpdatedAt} />
      <QueryState query={users}>
        {(all) => {
          const summary = summarizeUsers(all);
          return (
            <>
              <Section title="Needs attention" subtitle="People and access">
                <KpiGrid columns={3}>
                  <KpiCard
                    wide
                    to={USERS_BASE}
                    icon={Users}
                    tone={ACTIVE_DISPLAY.active.className}
                    count={summary.active}
                    label="Active users"
                    clear="No active users"
                    chips={USER_ROLES.filter((role) => summary.byRole[role] > 0).map((role) => (
                      <ChipLink key={role} to={USERS_BASE} colors={ROLE_DISPLAY[role].className}>
                        {roleChipLabel(role, summary.byRole[role])}
                      </ChipLink>
                    ))}
                  />
                  <KpiCard
                    to={USERS_BASE}
                    icon={UserPlus}
                    tone={AGING_DISPLAY.yellow.className}
                    count={summary.inactive}
                    label="Inactive users"
                    clear="Everyone can sign in"
                  />
                  <KpiCard
                    to={USERS_BASE}
                    icon={ShieldAlert}
                    tone={AGING_DISPLAY.orange.className}
                    count={summary.withoutManager}
                    label="Engineers without a manager"
                    clear="Every alert has a recipient"
                  />
                </KpiGrid>
              </Section>

              <Section title="Overview" subtitle="Who has access">
                <OverviewGrid>
                  <OverviewCard
                    title="Users by role"
                    meta={`${summary.active} users`}
                    items={roleItems(summary)}
                  />
                  <OverviewCard
                    title="Engineers per manager"
                    meta={`${summary.engineers} ${summary.engineers === 1 ? "engineer" : "engineers"}`}
                    items={managerItems(summary)}
                  />
                </OverviewGrid>
              </Section>
            </>
          );
        }}
      </QueryState>

      <Section title="Top items" subtitle="Latest activity across the system">
        <RecentActivity />
      </Section>
    </>
  );
}
