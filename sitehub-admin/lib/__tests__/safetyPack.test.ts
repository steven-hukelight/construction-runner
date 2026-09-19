import {
  defaultInductionSafetySections,
  normalizeSafetySections,
  safetyPackHasContent,
} from "@/lib/induction/safetyPack";

describe("induction safety pack", () => {
  it("has a non-empty company default", () => {
    const sections = defaultInductionSafetySections();
    expect(sections.length).toBeGreaterThanOrEqual(4);
    expect(safetyPackHasContent(sections)).toBe(true);
  });

  it("drops blank titles", () => {
    expect(
      normalizeSafetySections([
        { id: "a", title: "PPE", body: "Hats" },
        { id: "b", title: "   ", body: "ignored" },
      ]),
    ).toEqual([{ id: "a", title: "PPE", body: "Hats" }]);
  });
});
