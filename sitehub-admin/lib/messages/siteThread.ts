import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  staffIdsForSite,
  userIdsForSiteContent,
  userIdsSignedInAtSite,
} from "@/lib/auth/siteAudience";
import { isCompanySuperAdmin, isPlatformSuperuser, normalizeRole } from "@/lib/auth/roles";
import { currentSignedInSiteId } from "@/lib/auth/siteScope";

const STAFF_ROLES = new Set(["admin", "supervisor", "site_admin", "sub_admin", "superuser"]);

export function isMessagingStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.has(normalizeRole(role));
}

export function canOpenSiteChannel(
  role: string | null | undefined,
  userId: string,
  memberIds: string[]
): boolean {
  if (isCompanySuperAdmin(role) || isPlatformSuperuser(role)) return true;
  return memberIds.includes(userId);
}

function addId(ids: Set<string>, value: unknown) {
  const id = String(value ?? "").trim();
  if (id) ids.add(id);
}

/** Everyone who belongs on a site channel: assigned, signed in, and site staff. */
export async function siteChannelMemberIds(companyId: string, siteId: string): Promise<string[]> {
  const sid = siteId.trim();
  if (!companyId || !sid) return [];
  const [content, staff, signedIn] = await Promise.all([
    userIdsForSiteContent(companyId, sid),
    staffIdsForSite(companyId, sid),
    userIdsSignedInAtSite(sid),
  ]);
  const ids = new Set<string>();
  for (const id of [...content, ...staff, ...signedIn]) addId(ids, id);
  return [...ids];
}

export async function syncThreadRecipients(threadId: string, userIds: string[]): Promise<void> {
  const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (!threadId || ids.length === 0) return;
  const { data: existing } = await supabaseAdmin
    .from("message_recipients")
    .select("user_id")
    .eq("thread_id", threadId);
  const have = new Set(
    (Array.isArray(existing) ? existing : []).map((r) => String((r as { user_id: string }).user_id))
  );
  const missing = ids.filter((id) => !have.has(id));
  if (missing.length === 0) return;
  await supabaseAdmin
    .from("message_recipients")
    .insert(missing.map((user_id) => ({ thread_id: threadId, user_id })));
}

export async function findSiteChannelId(companyId: string, siteId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("message_threads")
    .select("id")
    .eq("company_id", companyId)
    .eq("site_id", siteId)
    .eq("kind", "site")
    .not("archived", "eq", true)
    .maybeSingle();
  return data ? String((data as { id: string }).id) : null;
}

export async function findOrCreateSiteChannel(opts: {
  companyId: string;
  siteId: string;
  createdBy: string;
}): Promise<{ id: string; created: boolean }> {
  const existing = await findSiteChannelId(opts.companyId, opts.siteId);
  if (existing) return { id: existing, created: false };

  const { data, error } = await supabaseAdmin
    .from("message_threads")
    .insert({
      created_by: opts.createdBy,
      company_id: opts.companyId,
      site_id: opts.siteId,
      kind: "site",
    })
    .select("id")
    .single();

  if (!error && data) return { id: String((data as { id: string }).id), created: true };

  const raced = await findSiteChannelId(opts.companyId, opts.siteId);
  if (raced) return { id: raced, created: false };
  throw new Error(error?.message || "Failed to create site channel");
}

export async function findDirectThreadId(
  companyId: string,
  userA: string,
  userB: string
): Promise<string | null> {
  if (!userA || !userB || userA === userB) return null;
  const { data: mine } = await supabaseAdmin
    .from("message_recipients")
    .select("thread_id")
    .eq("user_id", userA);
  const myIds = [
    ...new Set(
      (Array.isArray(mine) ? mine : []).map((r) => String((r as { thread_id: string }).thread_id))
    ),
  ];
  if (myIds.length === 0) return null;

  const { data: theirs } = await supabaseAdmin
    .from("message_recipients")
    .select("thread_id")
    .eq("user_id", userB)
    .in("thread_id", myIds);
  const shared = [
    ...new Set(
      (Array.isArray(theirs) ? theirs : []).map((r) => String((r as { thread_id: string }).thread_id))
    ),
  ];
  if (shared.length === 0) return null;

  const { data: threads } = await supabaseAdmin
    .from("message_threads")
    .select("id")
    .eq("company_id", companyId)
    .eq("kind", "direct")
    .in("id", shared)
    .not("archived", "eq", true);
  const candidates = (Array.isArray(threads) ? threads : []).map((t) => String((t as { id: string }).id));
  if (candidates.length === 0) return null;

  const { data: recs } = await supabaseAdmin
    .from("message_recipients")
    .select("thread_id, user_id")
    .in("thread_id", candidates);
  const byThread = new Map<string, Set<string>>();
  for (const r of Array.isArray(recs) ? recs : []) {
    const row = r as { thread_id: string; user_id: string };
    const set = byThread.get(row.thread_id) ?? new Set<string>();
    set.add(row.user_id);
    byThread.set(row.thread_id, set);
  }
  for (const id of candidates) {
    const set = byThread.get(id);
    if (set && set.size === 2 && set.has(userA) && set.has(userB)) return id;
  }
  return null;
}

export async function siteIdsLinkedToUser(userId: string): Promise<string[]> {
  const ids = new Set<string>();
  const [{ data: us }, { data: assignedByUser }, { data: assignedByUserid }, { data: inducted }] =
    await Promise.all([
      supabaseAdmin.from("user_sites").select("site_id").eq("user_id", userId),
      supabaseAdmin.from("assigned_operatives").select("site_id").eq("user_id", userId),
      supabaseAdmin.from("assigned_operatives").select("site_id").eq("userid", userId),
      supabaseAdmin.from("user_site_inductions").select("site_id").eq("user_id", userId),
    ]);
  for (const row of us ?? []) addId(ids, (row as { site_id?: string }).site_id);
  for (const row of assignedByUser ?? []) addId(ids, (row as { site_id?: string }).site_id);
  for (const row of assignedByUserid ?? []) addId(ids, (row as { site_id?: string }).site_id);
  for (const row of inducted ?? []) addId(ids, (row as { site_id?: string }).site_id);
  return [...ids];
}

async function companyStaffIds(companyId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("company_id", companyId)
    .not("disabled", "eq", true);
  return (data ?? [])
    .filter((u) => isMessagingStaffRole((u as { role?: string | null }).role))
    .map((u) => String((u as { id: string }).id));
}

async function companyUserIds(companyId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .not("disabled", "eq", true);
  return (data ?? []).map((u) => String((u as { id: string }).id));
}

/** People the caller may start a private thread with. */
export async function messageableUserIds(opts: {
  companyId: string;
  userId: string;
  role?: string | null;
  siteId?: string | null;
}): Promise<{ siteId: string | null; userIds: string[] }> {
  let siteId = (opts.siteId ?? "").trim() || null;
  if (!siteId) {
    siteId = await currentSignedInSiteId(opts.userId, opts.companyId);
  }

  if (siteId) {
    const members = await siteChannelMemberIds(opts.companyId, siteId);
    return { siteId, userIds: members.filter((id) => id !== opts.userId) };
  }

  if (isCompanySuperAdmin(opts.role) || isPlatformSuperuser(opts.role)) {
    const all = await companyUserIds(opts.companyId);
    return { siteId: null, userIds: all.filter((id) => id !== opts.userId) };
  }

  const linked = await siteIdsLinkedToUser(opts.userId);
  const fromSites = (
    await Promise.all(linked.slice(0, 25).map((sid) => siteChannelMemberIds(opts.companyId, sid)))
  ).flat();
  const staff = await companyStaffIds(opts.companyId);
  return {
    siteId: null,
    userIds: [...new Set([...fromSites, ...staff])].filter((id) => id !== opts.userId),
  };
}
