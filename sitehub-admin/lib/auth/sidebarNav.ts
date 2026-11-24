import { normalizeRole } from "./roles";

/** Hrefs office roles should not see in the main sidebar. */
const HIDDEN_BY_ROLE: Record<string, readonly string[]> = {
  sub_admin: ["/dashboard/subcontractors", "/dashboard/users", "/dashboard/pending-approvals"],
};

export function sidebarHrefVisible(role: string | null | undefined, href: string): boolean {
  const r = normalizeRole(role);
  if (r === "admin" || r === "superuser") return true;
  const hidden = HIDDEN_BY_ROLE[r];
  if (!hidden) return true;
  return !hidden.includes(href);
}
