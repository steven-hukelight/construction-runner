import {
  assetInspectionRemindersEnabled,
  mergePreferences,
  parseNotificationPreferences,
  pickPreferencePatch,
} from "@/lib/notificationPreferences";

describe("parseNotificationPreferences", () => {
  it("defaults every preference to on", () => {
    expect(parseNotificationPreferences(null)).toEqual({
      operativePendingApproval: true,
      assetInspectionReminders: true,
    });
    expect(parseNotificationPreferences([])).toEqual({
      operativePendingApproval: true,
      assetInspectionReminders: true,
    });
  });

  it("only treats an explicit false as opted out", () => {
    expect(assetInspectionRemindersEnabled({ assetInspectionReminders: false })).toBe(false);
    expect(assetInspectionRemindersEnabled({ assetInspectionReminders: "false" })).toBe(true);
    expect(assetInspectionRemindersEnabled({ operativePendingApproval: false })).toBe(true);
  });
});

describe("pickPreferencePatch", () => {
  it("keeps known boolean keys and ignores unknown ones", () => {
    expect(pickPreferencePatch({ assetInspectionReminders: false, other: true })).toEqual({
      patch: { assetInspectionReminders: false },
    });
  });

  it("rejects non-boolean values and empty bodies", () => {
    expect(pickPreferencePatch({ assetInspectionReminders: "no" })).toEqual({
      error: "assetInspectionReminders must be a boolean",
    });
    expect("error" in pickPreferencePatch({})).toBe(true);
    expect("error" in pickPreferencePatch(null)).toBe(true);
  });
});

describe("mergePreferences", () => {
  it("preserves unrelated stored keys", () => {
    expect(mergePreferences({ operativePendingApproval: false, legacy: 1 }, { assetInspectionReminders: false })).toEqual({
      operativePendingApproval: false,
      legacy: 1,
      assetInspectionReminders: false,
    });
  });
});
