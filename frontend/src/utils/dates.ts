const riyadhFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Riyadh",
  dateStyle: "medium",
  timeStyle: "short",
});

// The API sends UTC (e.g. 2026-11-01T22:57:00Z). We always show Riyadh time,
// whatever time zone the browser or computer is set to.
export function formatRiyadh(isoUtc: string): string {
  return riyadhFormat.format(new Date(isoUtc));
}
