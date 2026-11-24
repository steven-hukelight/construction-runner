import { sidebarHrefVisible } from "../auth/sidebarNav";

describe("sidebarHrefVisible", () => {
  it("lets Super Admin see the full office list", () => {
    expect(sidebarHrefVisible("admin", "/dashboard/users")).toBe(true);
    expect(sidebarHrefVisible("admin", "/dashboard/subcontractors")).toBe(true);
    expect(sidebarHrefVisible("admin", "/dashboard/pending-approvals")).toBe(true);
  });

  it("lets supervisors see subcontractors and pending approvals", () => {
    expect(sidebarHrefVisible("supervisor", "/dashboard/sites")).toBe(true);
    expect(sidebarHrefVisible("supervisor", "/dashboard/users")).toBe(true);
    expect(sidebarHrefVisible("supervisor", "/dashboard/subcontractors")).toBe(true);
    expect(sidebarHrefVisible("supervisor", "/dashboard/pending-approvals")).toBe(true);
  });

  it("hides the company directory from subcontractor admins", () => {
    expect(sidebarHrefVisible("sub_admin", "/dashboard/users")).toBe(false);
    expect(sidebarHrefVisible("sub_admin", "/dashboard/pending-approvals")).toBe(false);
    expect(sidebarHrefVisible("sub_admin", "/dashboard/attendance")).toBe(true);
  });
});
