/**
 * Roles that use site clock-in / attendance in the field. Office-style roles
 * (admin, superuser, sub_admin, viewer) should not see personal attendance on the welcome banner.
 */
const SITE_ATTENDANCE_ROLES = new Set(["supervisor", "operative"]);

export function isSiteAttendanceRole(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase().trim();
  return SITE_ATTENDANCE_ROLES.has(r);
}
