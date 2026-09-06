import {
  addCalendarDayYmd,
  londonCalendarDayUtcBounds,
  londonStartOfCalendarDayUtc,
  londonYmd,
} from "@/lib/attendanceLondonDay";

describe("attendanceLondonDay", () => {
  it("formats winter (GMT) calendar date", () => {
    expect(londonYmd(new Date("2026-01-15T00:30:00.000Z"))).toBe("2026-01-15");
    expect(londonYmd(new Date("2026-01-15T23:30:00.000Z"))).toBe("2026-01-15");
  });

  it("rolls to the next London date after BST midnight", () => {
    expect(londonYmd(new Date("2026-07-15T22:30:00.000Z"))).toBe("2026-07-15");
    expect(londonYmd(new Date("2026-07-15T23:30:00.000Z"))).toBe("2026-07-16");
  });

  it("uses 00:00 UTC as London midnight in winter", () => {
    expect(londonStartOfCalendarDayUtc("2026-01-15").toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("uses 23:00 UTC previous day as London midnight in summer", () => {
    expect(londonStartOfCalendarDayUtc("2026-07-15").toISOString()).toBe("2026-07-14T23:00:00.000Z");
  });

  it("returns a half-open London day window", () => {
    const jan = londonCalendarDayUtcBounds("2026-01-15");
    expect(jan.start).toBe("2026-01-15T00:00:00.000Z");
    expect(jan.end).toBe("2026-01-16T00:00:00.000Z");

    const jul = londonCalendarDayUtcBounds("2026-07-15");
    expect(jul.start).toBe("2026-07-14T23:00:00.000Z");
    expect(jul.end).toBe("2026-07-15T23:00:00.000Z");
  });

  it("adds calendar days on the YMD string", () => {
    expect(addCalendarDayYmd("2026-01-31", 1)).toBe("2026-02-01");
  });
});
