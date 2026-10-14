import {
  AUTO_SIGN_OUT_RESUME_MS,
  autoSignOutExitAt,
  shouldResumeAfterAutoSignOut,
} from "../attendanceResumeAfterAutoSignOut";
import { SIGN_IN_GRACE_MS } from "../attendanceImmediateGeofence";

const site = "7e934612-c48f-4374-9228-c74d8f70bc6a";
const now = new Date("2026-10-09T07:36:40.000Z");
const exitAt = new Date("2026-10-09T07:35:10.000Z");

function base(
  overrides: Partial<Parameters<typeof shouldResumeAfterAutoSignOut>[0]> = {},
) {
  return shouldResumeAfterAutoSignOut({
    autoSignOut: true,
    lastActionNorm: "SIGN_OUT",
    lastSiteId: site,
    signInSiteId: site,
    reason: "geofence_exit_immediate",
    exitAt,
    now,
    ...overrides,
  });
}

describe("shouldResumeAfterAutoSignOut", () => {
  it("uses the same 3 minute window as GPS settle after sign-in", () => {
    expect(AUTO_SIGN_OUT_RESUME_MS).toBe(SIGN_IN_GRACE_MS);
    expect(AUTO_SIGN_OUT_RESUME_MS).toBe(3 * 60_000);
  });

  it("resumes when the operative signs back into the same site within 3 minutes", () => {
    expect(base()).toBe(true);
  });

  it("does not resume after the window", () => {
    expect(
      base({
        now: new Date(exitAt.getTime() + AUTO_SIGN_OUT_RESUME_MS + 1_000),
      }),
    ).toBe(false);
  });

  it("does not resume a manual sign-out", () => {
    expect(base({ autoSignOut: false })).toBe(false);
  });

  it("does not resume a 12-hour max-shift close", () => {
    expect(base({ reason: "fallback_max_shift" })).toBe(false);
  });

  it("does not resume at a different site", () => {
    expect(base({ signInSiteId: "other-site" })).toBe(false);
  });

  it("reads exit_time from the closed row", () => {
    expect(
      autoSignOutExitAt({
        exit_time: "2026-10-09T07:35:10.000Z",
        sign_out_time: "2026-10-09T07:35:11.000Z",
      })?.toISOString(),
    ).toBe("2026-10-09T07:35:10.000Z");
  });
});
