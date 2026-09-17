import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { usesAssignedSites } from "@/lib/auth/roles";

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
