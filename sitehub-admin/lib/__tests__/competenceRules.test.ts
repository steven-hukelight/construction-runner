import {
  cardFlags,
  checkRequirement,
  expiryStage,
  parseRequirement,
  requirementLabel,
  type HeldCard,
  type Holdings,
} from "@/lib/competence/rules";

const today = "2026-11-07";

const card = (over: Partial<HeldCard> = {}): HeldCard => ({
  type: "CSCS",
  level: "Blue",
  number: "12345678",
  expiry: "2028-01-01",
  checkedAt: "2026-10-01T09:00:00Z",
  ...over,
});

const holdings = (over: Partial<Holdings> = {}): Holdings => ({ card: card(), tickets: [], ...over });

describe("parseRequirement", () => {
  it("accepts known card types and CSCS colours", () => {
    expect(parseRequirement({ kind: "card", code: "cscs", level: "gold" })).toEqual({ kind: "card", code: "CSCS", level: "Gold" });
    expect(parseRequirement({ kind: "card", code: "CPCS" })).toEqual({ kind: "card", code: "CPCS", level: null });
  });

  it("rejects unknown cards, colours on non-CSCS cards and empty tickets", () => {
    expect(parseRequirement({ kind: "card", code: "Other" })).toBeNull();
    expect(parseRequirement({ kind: "card", code: "JIB", level: "Gold" })).toBeNull();
    expect(parseRequirement({ kind: "card", code: "CSCS", level: "Purple" })).toBeNull();
    expect(parseRequirement({ kind: "ticket", code: "  " })).toBeNull();
    expect(parseRequirement({ kind: "badge", code: "IPAF" })).toBeNull();
  });

  it("keeps free-text tickets and normalises known ones", () => {
    expect(parseRequirement({ kind: "ticket", code: "first aid" })).toEqual({ kind: "ticket", code: "FIRST_AID", level: null });
    expect(parseRequirement({ kind: "ticket", code: "IPAF 3a" })).toEqual({ kind: "ticket", code: "IPAF 3a", level: null });
  });
});

describe("requirementLabel", () => {
  it("reads naturally", () => {
    expect(requirementLabel({ kind: "card", code: "CSCS", level: "Gold" })).toBe("CSCS Gold");
    expect(requirementLabel({ kind: "card", code: "CPCS" })).toBe("CPCS card");
    expect(requirementLabel({ kind: "ticket", code: "FIRST_AID" })).toBe("First aid");
  });
});

describe("checkRequirement", () => {
  it("passes a matching card and notes when nobody has checked it", () => {
    expect(checkRequirement({ kind: "card", code: "CSCS" }, holdings(), today)).toEqual({ ok: true, unchecked: false });
    expect(checkRequirement({ kind: "card", code: "CSCS" }, holdings({ card: card({ checkedAt: null }) }), today)).toEqual({
      ok: true,
      unchecked: true,
    });
  });

  it("fails a missing, expired or different card", () => {
    expect(checkRequirement({ kind: "card", code: "CSCS" }, holdings({ card: null }), today)).toMatchObject({ ok: false, reason: "missing" });
    expect(checkRequirement({ kind: "card", code: "CSCS" }, holdings({ card: card({ expiry: "2026-11-06" }) }), today)).toMatchObject({
      ok: false,
      reason: "expired",
    });
    expect(checkRequirement({ kind: "card", code: "CPCS" }, holdings(), today)).toMatchObject({ ok: false, reason: "wrong_card" });
  });

  it("treats higher CSCS colours as meeting lower ones, but Red and White only meet themselves", () => {
    const gold = holdings({ card: card({ level: "Gold" }) });
    expect(checkRequirement({ kind: "card", code: "CSCS", level: "Blue" }, gold, today).ok).toBe(true);
    expect(checkRequirement({ kind: "card", code: "CSCS", level: "Black" }, gold, today)).toMatchObject({ reason: "level_too_low" });
    const red = holdings({ card: card({ level: "Red" }) });
    expect(checkRequirement({ kind: "card", code: "CSCS", level: "Green" }, red, today).ok).toBe(false);
  });

  it("accepts a second card recorded as a certificate when no colour is needed", () => {
    const h = holdings({ tickets: [{ code: "CPCS", label: "CPCS", expiry: "2027-05-01" }] });
    expect(checkRequirement({ kind: "card", code: "CPCS" }, h, today).ok).toBe(true);
  });

  it("matches tickets by name and ignores expired copies when a current one exists", () => {
    const h = holdings({
      tickets: [
        { code: "IPAF 3a 3b", label: "IPAF 3a 3b", expiry: "2025-01-01" },
        { code: "IPAF", label: "IPAF", expiry: "2027-01-01" },
      ],
    });
    expect(checkRequirement({ kind: "ticket", code: "IPAF" }, h, today).ok).toBe(true);
    expect(checkRequirement({ kind: "ticket", code: "IPAF 3a" }, h, today)).toMatchObject({ ok: false, reason: "expired" });
    expect(checkRequirement({ kind: "ticket", code: "PASMA" }, h, today)).toMatchObject({ ok: false, reason: "missing" });
    expect(checkRequirement({ kind: "ticket", code: "FIRST_AID" }, holdings({ tickets: [{ code: "First aid", label: "First aid", expiry: null }] }), today).ok).toBe(true);
  });
});

describe("cardFlags", () => {
  it("flags a shared number, an expired card and a missing check", () => {
    const flags = cardFlags(card({ expiry: "2026-01-01", checkedAt: null }), today, 2).map((f) => f.code);
    expect(flags).toEqual(["duplicate_number", "expired", "not_checked"]);
  });

  it("has nothing to say about a current, checked, unique card or no card", () => {
    expect(cardFlags(card(), today, 0)).toEqual([]);
    expect(cardFlags(null, today, 0)).toEqual([]);
  });
});

describe("expiryStage", () => {
  it("picks the most urgent reminder", () => {
    expect(expiryStage("2027-01-06", today)).toBe("d60");
    expect(expiryStage("2026-12-07", today)).toBe("d30");
    expect(expiryStage("2026-11-14", today)).toBe("d7");
    expect(expiryStage("2026-11-07", today)).toBe("d7");
    expect(expiryStage("2026-11-01", today)).toBe("expired");
  });

  it("stays quiet far ahead, long after, or with no date", () => {
    expect(expiryStage("2027-03-01", today)).toBeNull();
    expect(expiryStage("2026-09-01", today)).toBeNull();
    expect(expiryStage(null, today)).toBeNull();
  });
});
