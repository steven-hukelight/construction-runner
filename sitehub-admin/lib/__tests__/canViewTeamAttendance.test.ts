import { canEditWorkCatalogue, canViewTeamAttendance } from "@/lib/auth/roles";

describe("canViewTeamAttendance", () => {
  it.each(["superuser", "admin", "site_admin", "supervisor", " Supervisor "])("allows %s", (role) => {
    expect(canViewTeamAttendance(role)).toBe(true);
  });

  it.each(["operative", "sub_admin", "viewer", "", null, undefined])("limits %p to their own records", (role) => {
    expect(canViewTeamAttendance(role)).toBe(false);
  });
});

describe("canEditWorkCatalogue", () => {
  it("allows site staff who can assign people", () => {
    expect(canEditWorkCatalogue("site_admin", true)).toBe(true);
    expect(canEditWorkCatalogue("supervisor", true)).toBe(true);
    expect(canEditWorkCatalogue("admin", true)).toBe(true);
  });

  it("blocks the same roles when they are not staff on that site", () => {
    expect(canEditWorkCatalogue("site_admin", false)).toBe(false);
    expect(canEditWorkCatalogue("admin", false)).toBe(false);
  });
});
