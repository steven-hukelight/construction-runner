import { autoSignOutEnabledFromRow } from "@/lib/attendance/autoSignOutEnabled";

describe("autoSignOutEnabledFromRow", () => {
  it("stays off unless the company flag is exactly true", () => {
    expect(autoSignOutEnabledFromRow(true)).toBe(true);
    expect(autoSignOutEnabledFromRow(false)).toBe(false);
    expect(autoSignOutEnabledFromRow(null)).toBe(false);
    expect(autoSignOutEnabledFromRow(undefined)).toBe(false);
    expect(autoSignOutEnabledFromRow("true")).toBe(false);
  });
});
