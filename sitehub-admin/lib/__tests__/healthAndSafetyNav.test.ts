import {
  HEALTH_AND_SAFETY_HREF,
  healthAndSafetyGroupsForRole,
  healthAndSafetyTabsForRole,
  isHealthAndSafetyPath,
  isHealthAndSafetyTabActive,
} from "../healthAndSafety/nav";

describe("health and safety nav", () => {
  it("homes on RAMS", () => {
    expect(HEALTH_AND_SAFETY_HREF).toBe("/dashboard/health-and-safety/rams");
    expect(isHealthAndSafetyPath("/dashboard/health-and-safety")).toBe(true);
    expect(isHealthAndSafetyPath("/dashboard/health-and-safety/rams")).toBe(true);
    expect(isHealthAndSafetyPath("/dashboard/sites")).toBe(false);
  });

  it("does not treat the overview as the RAMS tab", () => {
    expect(isHealthAndSafetyTabActive("/dashboard/health-and-safety", "/dashboard/health-and-safety/rams")).toBe(
      false,
    );
    expect(isHealthAndSafetyTabActive("/dashboard/health-and-safety/rams/abc", "/dashboard/health-and-safety/rams")).toBe(
      true,
    );
  });

  it("groups destinations and hides near miss when the role cannot view it", () => {
    const withNearMiss = healthAndSafetyGroupsForRole(true);
    const withoutNearMiss = healthAndSafetyGroupsForRole(false);
    expect(withNearMiss.map((g) => g.name)).toEqual(["Documents", "Access", "Live risk", "Evidence"]);
    expect(withNearMiss.some((g) => g.tabs.some((t) => t.name === "Near miss"))).toBe(true);
    expect(withoutNearMiss.some((g) => g.tabs.some((t) => t.name === "Near miss"))).toBe(false);
    expect(healthAndSafetyTabsForRole(false).some((t) => t.name === "Near miss")).toBe(false);
  });
});
