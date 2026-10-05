/** Roles that may view near-miss reports: admin and supervisor for their own company, superuser for any. */
export const NEAR_MISS_VIEWER_ROLES = new Set(["admin", "supervisor", "superuser"]);

export function canRoleViewNearMiss(role: string | null | undefined): boolean {
  return NEAR_MISS_VIEWER_ROLES.has((role ?? "").trim().toLowerCase());
}
