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

const calendarDateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  dateStyle: "medium",
});

// A plain calendar date (YYYY-MM-DD, as the API sends invoice dates). It has no time zone,
// so it is shown as written: formatting it as an instant would shift it by the UTC offset.
export function formatDate(isoDate: string): string {
  return calendarDateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

// Today's calendar date in Riyadh as YYYY-MM-DD (en-CA formats this way).
export function riyadhToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}

const riyadhDateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Riyadh",
  dateStyle: "medium",
});

// An instant (UTC, as the API sends timestamps) shown as its Riyadh calendar date, no time.
export function formatRiyadhDate(isoUtc: string): string {
  return riyadhDateFormat.format(new Date(isoUtc));
}
