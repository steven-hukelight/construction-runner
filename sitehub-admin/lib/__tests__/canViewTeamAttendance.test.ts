import { canViewTeamAttendance } from "@/lib/auth/roles";

describe("canViewTeamAttendance", () => {
  it.each(["superuser", "admin", "site_admin", "supervisor", " Supervisor "])("allows %s", (role) => {
    expect(canViewTeamAttendance(role)).toBe(true);
  });

  it.each(["operative", "sub_admin", "viewer", "", null, undefined])("limits %p to their own records", (role) => {
    expect(canViewTeamAttendance(role)).toBe(false);
  });
});
