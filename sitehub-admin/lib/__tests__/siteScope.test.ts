import { siteVisibilityOr } from "../auth/siteScope";

describe("siteVisibilityOr", () => {
  it("includes the selected site and site-wide rows", () => {
    expect(siteVisibilityOr(["site-1"])).toBe("site_id.eq.site-1,site_wide.eq.true");
  });

  it("lists several assigned sites", () => {
    expect(siteVisibilityOr(["a", "b"])).toBe("site_id.in.(a,b),site_wide.eq.true");
  });

  it("drops ids that would break the filter", () => {
    expect(siteVisibilityOr(["ok", "bad id"])).toBe("site_id.eq.ok,site_wide.eq.true");
    expect(siteVisibilityOr(["bad id"])).toBeNull();
  });
});
