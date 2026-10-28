import {
  applyRemindCooldown,
  capRecipients,
  DOCUMENT_REMIND_CAP,
  splitByInduction,
  unsignedUserIds,
} from "@/lib/documentReminderEligibility";
import { isReviewOverdue, parseReviewDateInput } from "@/lib/ramsReviewDate";

describe("document reminder eligibility", () => {
  it("drops people who already acknowledged", () => {
    expect(unsignedUserIds(["a", "b", "c"], ["b", "c"])).toEqual(["a"]);
  });

  it("splits briefing recipients missing induction", () => {
    const split = splitByInduction(["a", "b"], new Set(["a"]));
    expect(split.eligible).toEqual(["a"]);
    expect(split.skippedInduction).toEqual(["b"]);
  });

  it("skips a person reminded in the last 24 hours", () => {
    const now = new Date("2026-10-28T15:00:00.000Z");
    const result = applyRemindCooldown(
      ["a", "b"],
      { a: "2026-10-28T14:00:00.000Z", b: "2026-10-27T14:00:00.000Z" },
      now
    );
    expect(result.sendable).toEqual(["b"]);
    expect(result.skippedRecent).toEqual(["a"]);
  });

  it("caps at 50", () => {
    const ids = Array.from({ length: 52 }, (_, i) => String(i));
    const capped = capRecipients(ids);
    expect(capped.take).toHaveLength(DOCUMENT_REMIND_CAP);
    expect(capped.skippedCap).toBe(2);
  });
});

describe("RAMS review date", () => {
  it("accepts YYYY-MM-DD and treats blank as clear", () => {
    expect(parseReviewDateInput("2026-12-01")).toBe("2026-12-01");
    expect(parseReviewDateInput("")).toBeNull();
    expect(parseReviewDateInput(null)).toBeNull();
    expect(parseReviewDateInput(undefined)).toBeUndefined();
  });

  it("flags a past review date as overdue", () => {
    expect(isReviewOverdue("2026-10-01", new Date("2026-10-28T12:00:00Z"))).toBe(true);
    expect(isReviewOverdue("2026-10-28", new Date("2026-10-28T12:00:00Z"))).toBe(false);
    expect(isReviewOverdue(null)).toBe(false);
  });
});
