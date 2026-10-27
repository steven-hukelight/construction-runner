jest.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }));

import { splitForManualArchive } from "@/lib/attendanceArchiveRun";

const row = (id: string, user: string, action: string, timestamp: string | null) => ({
  id,
  user_id: user,
  action,
  timestamp,
});

describe("splitForManualArchive", () => {
  it("keeps everyone whose latest row is a sign-in", () => {
    const { archive, keptUserIds } = splitForManualArchive([
      row("1", "on-site", "SIGN OUT", "2026-10-27T08:00:00Z"),
      row("2", "on-site", "SIGN IN", "2026-10-27T09:00:00Z"),
      row("3", "gone", "SIGN IN", "2026-10-27T07:00:00Z"),
      row("4", "gone", "SIGN OUT", "2026-10-27T15:00:00Z"),
    ]);
    expect([...keptUserIds]).toEqual(["on-site"]);
    expect(archive.map((r) => r.id)).toEqual(["3", "4"]);
  });

  it("archives a sign-in row that was later updated to a sign-out", () => {
    const { archive, keptUserIds } = splitForManualArchive([row("1", "auto", "SIGN OUT", "2026-10-27T07:00:00Z")]);
    expect(keptUserIds.size).toBe(0);
    expect(archive).toHaveLength(1);
  });

  it("does not let a row without a time decide who is on site", () => {
    const { keptUserIds } = splitForManualArchive([
      row("1", "u", "SIGN IN", null),
      row("2", "u", "SIGN OUT", "2026-10-27T15:00:00Z"),
    ]);
    expect(keptUserIds.size).toBe(0);
  });

  it("treats spelling variants of sign-in the same", () => {
    const { keptUserIds } = splitForManualArchive([row("1", "u", "sign_in", "2026-10-27T07:00:00Z")]);
    expect(keptUserIds.has("u")).toBe(true);
  });
});
