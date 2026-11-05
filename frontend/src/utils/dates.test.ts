import { describe, expect, it } from "vitest";
import { formatRiyadhLongDate } from "./dates";

describe("formatRiyadhLongDate", () => {
  it("writes the weekday, day, short month and year", () => {
    expect(formatRiyadhLongDate(new Date("2026-11-04T10:00:00Z"))).toBe("Wednesday, 4 Nov 2026");
  });

  it("uses the Riyadh calendar day, not UTC (21:30 UTC is already the next day there)", () => {
    expect(formatRiyadhLongDate(new Date("2026-11-04T21:30:00Z"))).toBe("Thursday, 5 Nov 2026");
  });
});
