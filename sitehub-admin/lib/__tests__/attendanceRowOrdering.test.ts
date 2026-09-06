import { compareAttendanceNewestFirst } from "@/lib/attendanceRowOrdering";
import { resolveAttendanceStatusRow } from "@/lib/attendanceStatusRow";

describe("compareAttendanceNewestFirst", () => {
  it("orders by created_at descending when both set", () => {
    const a = { timestamp: "2026-04-04T12:00:00.000Z", created_at: "2026-04-04T10:00:00.000Z" };
    const b = { timestamp: "2026-04-04T11:00:00.000Z", created_at: "2026-04-04T11:30:00.000Z" };
    expect(compareAttendanceNewestFirst(a, b)).toBeGreaterThan(0);
    expect(compareAttendanceNewestFirst(b, a)).toBeLessThan(0);
  });

  it("treats missing created_at as older than rows with created_at", () => {
    const withCreated = { timestamp: "2026-04-04T09:00:00.000Z", created_at: "2026-04-04T09:00:00.000Z" };
    const withoutCreated = { timestamp: "2026-04-04T23:59:59.000Z", created_at: null };
    expect(compareAttendanceNewestFirst(withCreated, withoutCreated)).toBeLessThan(0);
  });

  it("uses timestamp when created_at ties", () => {
    const sameCreated = "2026-04-04T10:00:00.000Z";
    const newerTs = { timestamp: "2026-04-04T10:05:00.000Z", created_at: sameCreated };
    const olderTs = { timestamp: "2026-04-04T10:01:00.000Z", created_at: sameCreated };
    expect(compareAttendanceNewestFirst(newerTs, olderTs)).toBeLessThan(0);
  });
});

describe("resolveAttendanceStatusRow", () => {
  const priorDaySignIn = {
    action: "SIGN_IN",
    timestamp: "2026-09-05T18:00:00.000Z",
    created_at: "2026-09-05T18:00:00.000Z",
  };
  const todaySignOut = {
    action: "SIGN_OUT",
    timestamp: "2026-09-06T08:00:00.000Z",
    created_at: "2026-09-06T08:00:00.000Z",
  };

  it("surfaces a prior-day open sign-in when there are no rows today", () => {
    expect(resolveAttendanceStatusRow(null, priorDaySignIn)).toEqual(priorDaySignIn);
  });

  it("does not surface a prior-day sign-out when there are no rows today", () => {
    expect(resolveAttendanceStatusRow(null, { ...priorDaySignIn, action: "SIGN_OUT" })).toBeNull();
  });

  it("uses today's latest row when it is newer than the all-time latest", () => {
    expect(resolveAttendanceStatusRow(todaySignOut, priorDaySignIn)).toEqual(todaySignOut);
  });

  it("prefers an all-time open sign-in when it is newer than today's latest", () => {
    const laterSignIn = {
      action: "SIGN_IN",
      timestamp: "2026-09-06T09:00:00.000Z",
      created_at: "2026-09-06T09:00:00.000Z",
    };
    expect(resolveAttendanceStatusRow(todaySignOut, laterSignIn)).toEqual(laterSignIn);
  });
});
