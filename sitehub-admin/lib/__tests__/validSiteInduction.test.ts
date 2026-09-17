import {
  INDUCTION_EXPIRY_DAYS,
  isValidCompletedSiteInduction,
} from "@/lib/induction/validSiteInduction";

describe("isValidCompletedSiteInduction", () => {
  const now = Date.now();

  it("accepts a completed induction within 365 days", () => {
    expect(
      isValidCompletedSiteInduction({
        status: "completed",
        completed_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ).toBe(true);
  });

  it("rejects expired inductions", () => {
    expect(
      isValidCompletedSiteInduction({
        status: "completed",
        completed_at: new Date(
          now - (INDUCTION_EXPIRY_DAYS + 1) * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }),
    ).toBe(false);
  });

  it("rejects incomplete rows", () => {
    expect(
      isValidCompletedSiteInduction({
        status: "not_started",
        completed_at: new Date().toISOString(),
      }),
    ).toBe(false);
    expect(
      isValidCompletedSiteInduction({
        status: "completed",
        completed_at: null,
      }),
    ).toBe(false);
  });
});
