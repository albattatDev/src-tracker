import type { AgingBand } from "../../api/invoices";
import { AGING_DISPLAY } from "../Badges";
import { ChipLink } from "./Chip";
import { WORST_FIRST, bandLink } from "./dashboardModel";

// One chip per aging band that has invoices, worst first, each linking to the pending invoices
// of that band. `only` limits it to some bands (the manager's card shows Critical and Overdue).
export default function BandChips({
  bands,
  only = WORST_FIRST,
}: {
  bands: Record<AgingBand, number>;
  only?: AgingBand[];
}) {
  return (
    <>
      {WORST_FIRST.filter((band) => only.includes(band) && bands[band] > 0).map((band) => (
        <ChipLink key={band} to={bandLink(band)} colors={AGING_DISPLAY[band].className}>
          {bands[band]} {AGING_DISPLAY[band].label}
        </ChipLink>
      ))}
    </>
  );
}
