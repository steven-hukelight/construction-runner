import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeRole, usesAssignedSites } from "@/lib/auth/roles";

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
): string[] | "all" | "none" {
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

type SiteQuery = {
  in: (column: string, values: string[]) => SiteQuery;
  or: (filters: string) => SiteQuery;
};

/** Apply a site list. Site-wide rows stay visible when a site is selected. */
export function applySiteVisibility<T>(query: T, scope: string[] | "all" | "none"): T {
  if (scope === "all" || scope === "none") return query;
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
