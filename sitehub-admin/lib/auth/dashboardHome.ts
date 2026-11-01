/** Landing page for a dashboard role, so login can go straight there instead of via /dashboard. */
export function dashboardHomeForRole(role: string | null | undefined, impersonating = false): string {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "superuser" && !impersonating) return "/dashboard/superuser-dashboard";
  if (r === "supervisor") return "/dashboard/supervisor-dashboard";
  return "/dashboard/admin-dashboard";
}
