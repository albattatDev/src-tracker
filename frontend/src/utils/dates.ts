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

// A datetime with or without a zone, such as 2026-11-04T17:48:55.742404.
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_ZONE = /(Z|[+-]\d{2}:\d{2})$/;

// Text that looks like a datetime shows in Riyadh time ("5 Nov 2026, 01:28"), text that looks
// like a plain date shows as that date ("5 Nov 2026", no time zone shift). Any other text, and
// anything that only looks like a date (2026-13-45), is returned as it is.
// A datetime without a zone is read as UTC: the API stores and sends timestamps in UTC.
export function formatDateLikeText(text: string): string {
  if (DATETIME.test(text)) {
    // JavaScript keeps only milliseconds; trim the microseconds the database adds.
    const iso = text.replace(/(\.\d{3})\d+/, "$1");
    const instant = HAS_ZONE.test(iso) ? iso : `${iso}Z`;
    return Number.isNaN(Date.parse(instant)) ? text : formatRiyadh(instant);
  }
  if (DATE_ONLY.test(text)) {
    return Number.isNaN(Date.parse(`${text}T00:00:00Z`)) ? text : formatDate(text);
  }
  return text;
}
