import {
  appendOfflineRecordedNote,
  resolveOfflineOccurredAt,
} from "@/lib/attendance/offlineOccurredAt";

const now = new Date("2026-11-06T22:00:00.000Z");

describe("resolveOfflineOccurredAt", () => {
  it("accepts a time inside the last 24 hours", () => {
    const result = resolveOfflineOccurredAt("2026-11-06T10:15:00.000Z", now);
    expect(result).toEqual({ ok: true, iso: "2026-11-06T10:15:00.000Z" });
  });

  it("allows a couple of minutes of clock skew", () => {
    const result = resolveOfflineOccurredAt("2026-11-06T22:01:30.000Z", now);
    expect(result.ok).toBe(true);
  });

  it("rejects a time in the future", () => {
    const result = resolveOfflineOccurredAt("2026-11-06T22:05:00.000Z", now);
    expect(result).toEqual({ ok: false, error: "occurredAt is in the future" });
  });

  it("rejects a time older than 24 hours", () => {
    const result = resolveOfflineOccurredAt("2026-11-05T21:00:00.000Z", now);
    expect(result).toEqual({ ok: false, error: "occurredAt is older than 24 hours" });
  });

  it("rejects a missing or junk time", () => {
    expect(resolveOfflineOccurredAt("", now).ok).toBe(false);
    expect(resolveOfflineOccurredAt("yesterday", now).ok).toBe(false);
    expect(resolveOfflineOccurredAt(null, now).ok).toBe(false);
  });
});

describe("appendOfflineRecordedNote", () => {
  it("keeps existing notes and adds the offline flag", () => {
    const notes = appendOfflineRecordedNote("left site", "11111111-2222-4333-8444-555555555555");
    expect(notes.startsWith("left site\n")).toBe(true);
    expect(JSON.parse(notes.split("\n")[1])).toEqual({
      offline_recorded: true,
      client_event_id: "11111111-2222-4333-8444-555555555555",
    });
  });
});
