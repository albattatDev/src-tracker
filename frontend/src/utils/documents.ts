import type { CurrentDocument, DocumentStatus } from "../api/contractors";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// A document type with no upload yet has no API status; the UI shows it as "missing".
export function documentStatus(document: CurrentDocument | undefined): DocumentStatus | "missing" {
  return document?.status ?? "missing";
}

// The short note under a document's status badge. `days_left` is the API's value (calendar days
// in Asia/Riyadh, negative once expired), so nothing here reads the browser's clock. A valid
// document needs no note. Day 0 reads "Expires today": the status stays expiring_soon because
// the document is still usable that day.
export function documentDaysNote(document: CurrentDocument | undefined): string | null {
  if (!document) return "No file uploaded";
  switch (document.status) {
    case "expired":
      return `${plural(-document.days_left, "day")} ago`;
    case "expiring_soon":
      return document.days_left === 0 ? "Expires today" : `${plural(document.days_left, "day")} left`;
    case "valid":
      return null;
  }
}
