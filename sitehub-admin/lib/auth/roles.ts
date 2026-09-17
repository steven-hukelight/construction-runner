export function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").toLowerCase().trim();
}

/** Platform operator — all companies. */
export function isPlatformSuperuser(role: string | null | undefined): boolean {
  return normalizeRole(role) === "superuser";
}

/** Company Super Admin — all sites in one company. Stored as `admin`. */
export function isCompanySuperAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

/** Site Admin — only assigned sites in user_sites. */
export function isSiteAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === "site_admin";
}

/** Site Admin or Supervisor — access is the sites listed in user_sites. */
export function usesAssignedSites(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "site_admin" || r === "supervisor";
}

export function canCreateAndAssignSites(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "superuser" || r === "admin";
}

/** Only company Super Admin or platform Superuser may grant Super Admin. */
export function canAssignSuperAdminRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "superuser" || r === "admin";
}

export function canAccessCompanyAdminNav(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "admin" || r === "site_admin" || r === "supervisor" || r === "sub_admin";
}

export function roleDisplayName(role: string | null | undefined): string {
  const r = normalizeRole(role);
  if (!r) return "—";
  if (r === "superuser") return "Superuser";
  if (r === "admin") return "Super Admin";
  if (r === "site_admin") return "Site Admin";
  if (r === "sub_admin") return "Subcontractor admin";
  if (r === "supervisor") return "Supervisor";
  if (r === "operative") return "Operative";
  if (r === "viewer") return "Viewer";
  return r;
}

/** Roles a Super Admin / Superuser can assign when approving or inviting. */
export function assignableStaffRoles(approverRole: string | null | undefined): { value: string; label: string }[] {
  const r = normalizeRole(approverRole);
  if (r === "superuser" || r === "admin") {
    return [
      { value: "OPERATIVE", label: "Operative" },
      { value: "SUPERVISOR", label: "Supervisor" },
      { value: "SITE_ADMIN", label: "Site Admin" },
      { value: "ADMIN", label: "Super Admin" },
    ];
  }
  return [{ value: "OPERATIVE", label: "Operative" }];
}
