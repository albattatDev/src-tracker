import type { ReactNode } from "react";
import type { SRRead } from "../../api/serviceRequests";
import { formatRiyadh } from "../../utils/dates";
import { PersonName } from "../Avatar";
import { PriorityBadge } from "../Badges";
import LinkedInvoices from "./LinkedInvoices";

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-line last:border-b-0">
      <dt className="w-[88px] shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  );
}

// Everything the panel and the mobile screen show about a request. The two interactive rows
// come in as nodes (popover controls on desktop, sheet triggers on mobile); the rest is shared.
export default function SrDetailBody({
  sr,
  status,
  engineer,
}: {
  sr: SRRead;
  status: ReactNode;
  engineer: ReactNode;
}) {
  return (
    <>
      <h2 className="text-lg font-semibold">{sr.title}</h2>

      <dl className="mt-4">
        <PropertyRow label="Status">{status}</PropertyRow>
        <PropertyRow label="Priority">
          <PriorityBadge priority={sr.priority} />
        </PropertyRow>
        <PropertyRow label="Engineer">{engineer}</PropertyRow>
        <PropertyRow label="Requester">
          <PersonName name={sr.requester_name} />
        </PropertyRow>
        <PropertyRow label="Created">{formatRiyadh(sr.created_at)}</PropertyRow>
        <PropertyRow label="Updated">{formatRiyadh(sr.updated_at)}</PropertyRow>
      </dl>

      <section className="mt-6">
        <h3 className="text-base font-semibold">Description</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{sr.description}</p>
      </section>

      <LinkedInvoices sr={sr} />
    </>
  );
}
