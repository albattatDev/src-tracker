import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AGING_BANDS } from "../api/invoices";
import { SR_STATUSES } from "../api/serviceRequests";
import { AGING_DISPLAY, DOCUMENT_STATUS_DISPLAY, STATUS_DISPLAY } from "../components/Badges";
import { buttonClass } from "../components/buttonStyles";
import { useDashboard } from "../hooks/useDashboard";
import { INVOICES_BASE, SR_BASE } from "../routes";

interface CardProps {
  label: string;
  count: number;
  className: string; // colours come from Badges.tsx
  to: string;
}

function CountCard({ label, count, className, to }: CardProps) {
  return (
    <Link
      to={to}
      className={`block rounded-lg border border-gray-200 p-4 hover:shadow-sm ${className}`}
    >
      <div className="text-3xl font-semibold">{count}</div>
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-medium text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const query = useDashboard();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <button
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className={buttonClass("secondary")}
        >
          {query.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {query.isPending ? (
        <p className="text-gray-600">Loading…</p>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="mb-2">{query.error.message}</p>
          <button
            onClick={() => query.refetch()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <DashboardContent data={query.data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: NonNullable<ReturnType<typeof useDashboard>["data"]> }) {
  const { sr_by_status, invoices_by_band, documents } = data;
  const total =
    SR_STATUSES.reduce((sum, status) => sum + sr_by_status[status], 0) +
    (invoices_by_band ? AGING_BANDS.reduce((sum, band) => sum + invoices_by_band[band], 0) : 0) +
    (documents ? documents.expiring_soon + documents.expired : 0);

  return (
    <>
      {/* Zeros are information, so the cards stay even when everything is 0. */}
      {total === 0 && (
        <p className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-600">
          Nothing to show yet.
        </p>
      )}

      <Section title="Service requests">
        {SR_STATUSES.map((status) => (
          <CountCard
            key={status}
            label={STATUS_DISPLAY[status].label}
            count={sr_by_status[status]}
            className={STATUS_DISPLAY[status].className}
            to={`${SR_BASE}?status=${status}`}
          />
        ))}
      </Section>

      {invoices_by_band && (
        <Section title="Pending invoices by age">
          {AGING_BANDS.map((band) => (
            <CountCard
              key={band}
              label={AGING_DISPLAY[band].label}
              count={invoices_by_band[band]}
              className={AGING_DISPLAY[band].className}
              to={`${INVOICES_BASE}?band=${band}`}
            />
          ))}
        </Section>
      )}

      {documents && (
        <Section title="Contractor documents">
          <CountCard
            label={DOCUMENT_STATUS_DISPLAY.expiring_soon.label}
            count={documents.expiring_soon}
            className={DOCUMENT_STATUS_DISPLAY.expiring_soon.className}
            to="/contractors"
          />
          <CountCard
            label={DOCUMENT_STATUS_DISPLAY.expired.label}
            count={documents.expired}
            className={DOCUMENT_STATUS_DISPLAY.expired.className}
            to="/contractors"
          />
        </Section>
      )}
    </>
  );
}
