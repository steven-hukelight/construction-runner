import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeRole, usesAssignedSites } from "@/lib/auth/roles";
import { resolveMobileApiAuth, type MobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { listInductedSiteIdsForUser } from "@/lib/induction/listInductedSites";
import { fetchLatestAttendanceRowForUser } from "@/lib/attendanceLatestRow";
import { isOpenSignInAction } from "@/lib/attendanceStatusRow";

export async function resolveCallerUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value?.trim();
  if (uid) return uid;
  const email = cookieStore.get("user_email")?.value?.trim();
  if (!email) return null;
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

/**
 * Site restriction for the signed-in dashboard user.
 * `null` = no site filter (superuser, company Super Admin).
 * `[]` = Site Admin / Supervisor with no sites assigned.
 */
export async function getRestrictedSiteIds(
  role: string | null | undefined,
  userId?: string | null
): Promise<string[] | null> {
  if (!usesAssignedSites(role)) return null;
  const id = (userId ?? "").trim() || (await resolveCallerUserId());
  if (!id) return [];
  const { data } = await supabaseAdmin
    .from("user_sites")
    .select("site_id")
    .eq("user_id", id);
  return (data ?? []).map((r) => String(r.site_id));
}

/** `all` = no extra filter. `none` = caller must see zero rows. otherwise filter site_id to these ids. */
export function siteIdsForFilter(
  restricted: string[] | null,
  explicitSiteId?: string | null
): Exclude<SiteScope, "site_wide_only"> {
  const explicit = (explicitSiteId ?? "").trim();
  if (explicit) {
    if (restricted && !restricted.includes(explicit)) return "none";
    return [explicit];
  }
  if (restricted) {
    if (restricted.length === 0) return "none";
    return restricted;
  }
  return "all";
}

const SITE_ID_SAFE = /^[A-Za-z0-9_-]+$/;

/**
 * PostgREST OR filter: rows for these sites, plus company items marked site-wide.
 * Returns null when there is nothing safe to filter.
 */
export function siteVisibilityOr(siteIds: string[]): string | null {
  const ids = [...new Set(siteIds.map((id) => id.trim()).filter((id) => SITE_ID_SAFE.test(id)))];
  if (ids.length === 0) return null;
  if (ids.length === 1) return `site_id.eq.${ids[0]},site_wide.eq.true`;
  return `site_id.in.(${ids.join(",")}),site_wide.eq.true`;
}

/**
 * `all` = no extra filter. `none` = zero rows. `site_wide_only` = only company-wide rows.
 * Otherwise these site ids plus company-wide rows.
 */
export type SiteScope = string[] | "all" | "none" | "site_wide_only";

type SiteQuery = {
  in: (column: string, values: string[]) => SiteQuery;
  or: (filters: string) => SiteQuery;
  eq: (column: string, value: unknown) => SiteQuery;
};

/** Apply a site list. Site-wide rows stay visible when a site is selected. */
export function applySiteVisibility<T>(query: T, scope: SiteScope): T {
  if (scope === "all" || scope === "none") return query;
  if (scope === "site_wide_only") {
    return (query as unknown as SiteQuery).eq("site_wide", true) as unknown as T;
  }
  const clause = siteVisibilityOr(scope);
  if (!clause) return query;
  return (query as unknown as SiteQuery).or(clause) as unknown as T;
}

/** Sites an operative was added to (assigned_operatives). */
export async function getOperativeSiteIds(userId?: string | null): Promise<string[]> {
  const id = (userId ?? "").trim() || (await resolveCallerUserId());
  if (!id) return [];
  const { data } = await supabaseAdmin
    .from("assigned_operatives")
    .select("site_id")
    .eq("user_id", id);
  return [...new Set((data ?? []).map((r) => String(r.site_id)).filter(Boolean))];
}

/**
 * Selected site from the top bar (`currentSiteId`), otherwise an explicit query param.
 * Assigned-site roles stay inside their sites; operatives only see sites they were added to.
 * "All sites" is the cookie being empty.
 */
export async function dashboardSiteScope(
  role: string | null | undefined,
  explicitSiteId?: string | null,
  userId?: string | null
): Promise<string[] | "all" | "none"> {
  const cookieStore = await cookies();
  const fromQuery = (explicitSiteId ?? "").trim();
  const fromCookie = cookieStore.get("currentSiteId")?.value?.trim() || "";
  const chosen = fromQuery || fromCookie;
  const restricted =
    normalizeRole(role) === "operative"
      ? await getOperativeSiteIds(userId)
      : await getRestrictedSiteIds(role, userId);
  return siteIdsForFilter(restricted, chosen || null);
}

export function isMobileClientRequest(req: Request): boolean {
  return req.headers.get("x-client")?.toLowerCase().trim() === "mobile";
}

/** Whether a row fetched outside `applySiteVisibility` belongs in the scope. */
export function rowInSiteScope(
  row: { site_id?: string | null; site_wide?: boolean | null },
  scope: SiteScope,
  opts?: { keepUnsited?: boolean }
): boolean {
  if (scope === "all") return true;
  if (scope === "none") return false;
  if (row.site_wide === true) return true;
  const siteId = String(row.site_id ?? "").trim();
  if (!siteId) return opts?.keepUnsited === true;
  return scope !== "site_wide_only" && scope.includes(siteId);
}

/** Site of the caller's open sign-in, if their latest attendance row is a sign-in. */
export async function currentSignedInSiteId(
  userId: string,
  companyId?: string | null
): Promise<string | null> {
  try {
    const latest = await fetchLatestAttendanceRowForUser("action, site_id, created_at, timestamp", userId, companyId);
    if (!latest || !isOpenSignInAction(latest.action as string | null)) return null;
    const siteId = String(latest.site_id ?? "").trim();
    return siteId || null;
  } catch {
    return null;
  }
}

type DocumentScopeAuth = Pick<MobileApiAuth, "role" | "uid" | "companyId">;

/**
 * Document list scope. Web keeps the dashboard rules (`dashboardSiteScope`).
 * Mobile shows one site at a time:
 * - Operatives: `siteId` must be a site they are inducted on. Without one (older builds)
 *   they get the site they are signed in to, or only company-wide items.
 * - Supervisors / Site Admins: `siteId` must be one of their sites; none = all their sites.
 * - Company admins / superusers: `siteId` must belong to their company; none = all.
 */
export async function documentSiteScope(
  req: Request,
  opts: { siteId?: string | null; auth?: DocumentScopeAuth; role?: string | null }
): Promise<SiteScope> {
  const requested = (opts.siteId ?? "").trim();
  if (!isMobileClientRequest(req)) {
    return dashboardSiteScope(opts.auth?.role ?? opts.role, requested || null, opts.auth?.uid);
  }

  let auth = opts.auth;
  if (!auth) {
    const resolved = await resolveMobileApiAuth(req);
    if (resolved instanceof NextResponse) return "none";
    auth = resolved;
  }
  const uid = (auth.uid ?? "").trim();
  const role = normalizeRole(auth.role);

  if (role === "operative") {
    if (!uid) return "none";
    if (requested) {
      const inducted = await listInductedSiteIdsForUser(uid);
      return inducted.includes(requested) ? [requested] : "none";
    }
    const signedIn = await currentSignedInSiteId(uid, auth.companyId);
    return signedIn ? [signedIn] : "site_wide_only";
  }

  if (usesAssignedSites(role)) {
    return siteIdsForFilter(await getRestrictedSiteIds(role, uid), requested || null);
  }

  if (!requested) return "all";
  const companyId = (auth.companyId ?? "").trim();
  if (!companyId) return [requested];
  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("company_id")
    .eq("id", requested)
    .maybeSingle();
  const row = site as { company_id?: string | null } | null;
  if (!row) return "none";
  return row.company_id === companyId ? [requested] : "none";
}

/**
 * Operatives may open a document only if it is company-wide or its site is one they are
 * inducted on or assigned to (assigned keeps the induction flow working before completion).
 */
export async function assertDocumentSiteAccess(
  auth: Pick<MobileApiAuth, "role" | "uid">,
  doc: { site_id?: string | null; site_wide?: boolean | null }
): Promise<NextResponse | null> {
  if (normalizeRole(auth.role) !== "operative") return null;
  const siteId = String(doc.site_id ?? "").trim();
  if (doc.site_wide === true || !siteId) return null;
  const uid = (auth.uid ?? "").trim();
  if (uid) {
    const [inducted, assigned] = await Promise.all([
      listInductedSiteIdsForUser(uid),
      getOperativeSiteIds(uid),
    ]);
    if (inducted.includes(siteId) || assigned.includes(siteId)) return null;
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function assertWritableSiteId(
  role: string | null | undefined,
  siteId: string | null | undefined,
  userId?: string | null
): Promise<NextResponse | null> {
  const id = (siteId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { error: "Select a site. Documents, tasks and briefings stay in that site only." },
      { status: 400 }
    );
  }
  const restricted = await getRestrictedSiteIds(role, userId);
  if (restricted && !restricted.includes(id)) {
    return NextResponse.json(
      { error: "You can only add content to your assigned sites." },
      { status: 403 }
    );
  }
  return null;
}
