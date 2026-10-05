import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeActingOnUser, SAME_COMPANY_MANAGER_ROLES } from "@/lib/auth/actingOnUser";
import type { MobileApiAuth } from "@/app/api/_utils/mobileAuth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who a stored object belongs to, derived only from its bucket and path. */
export type StorageScope =
  | { kind: "user"; userId: string }
  | { kind: "signature"; companyId: string; userId: string }
  | { kind: "company"; companyId: string }
  | { kind: "site"; siteId: string }
  | { kind: "asset"; assetId: string }
  | { kind: "task"; taskId: string }
  /** Older layouts that carry no owner (near-miss attachments, `rams/<file>`, `briefings/<file>`): any verified user. */
  | { kind: "unscoped" };

/** Returns null for unknown buckets, unknown layouts and any empty, `.` or `..` segment. */
export function storageScope(bucket: string, path: string): StorageScope | null {
  const parts = path.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) return null;
  const [a, b, c] = parts;
  const n = parts.length;

  switch (bucket) {
    case "pre-induction":
      return n >= 3 && UUID.test(a) ? { kind: "user", userId: a } : null;
    case "medical":
      return n === 3 && a === "medical" && UUID.test(b) ? { kind: "user", userId: b } : null;
    case "company_documents":
      return n === 4 && (a === "rams-signatures" || a === "briefing-signatures") && UUID.test(c)
        ? { kind: "signature", companyId: b, userId: c }
        : null;
    case "uploads":
      if (n === 3 && a === "certifications" && UUID.test(b)) return { kind: "user", userId: b };
      if (n === 4 && a === "uploads" && (b === "certifications" || b === "training") && UUID.test(c)) {
        return { kind: "user", userId: c };
      }
      if (n === 3 && a === "site-rules") return { kind: "company", companyId: b };
      if (n === 3 && a === "tasks") return { kind: "task", taskId: b };
      return null;
    case "rams":
      if (n === 3 && a === "rams") return { kind: "site", siteId: b };
      if (n === 2 && a === "rams") return { kind: "unscoped" };
      return null;
    case "briefings":
      if (n === 3 && a === "briefings") return { kind: "site", siteId: b };
      if (n === 2 && a === "briefings") return { kind: "unscoped" };
      return null;
    case "assets":
      if (n === 3 && b === "images" && UUID.test(a)) return { kind: "asset", assetId: a };
      if (n === 3 && a === "assets" && UUID.test(b)) return { kind: "asset", assetId: b };
      if (n === 2 && a === "near_miss") return { kind: "unscoped" };
      return null;
    case "asset_photos":
      return n === 2 && a === "near_miss" ? { kind: "unscoped" } : null;
    default:
      return null;
  }
}

type Actor = MobileApiAuth & { uid: string };

function isSuperuser(actor: Actor) {
  return actor.isSuperuser || (actor.role ?? "").toLowerCase() === "superuser";
}

/** Site owner, a subcontractor company on the site, or an operative assigned to it. */
async function canSeeSite(actor: Actor, siteId: string): Promise<boolean> {
  const { data: site } = await supabaseAdmin.from("sites").select("company_id").eq("id", siteId).maybeSingle();
  if (!site) return false;
  if (actor.companyId && site.company_id === actor.companyId) return true;
  if (actor.companyId) {
    const { data: sub } = await supabaseAdmin
      .from("site_subcontractors")
      .select("site_id")
      .eq("site_id", siteId)
      .eq("company_id", actor.companyId)
      .maybeSingle();
    if (sub) return true;
  }
  const { data: assigned } = await supabaseAdmin
    .from("assigned_operatives")
    .select("id")
    .eq("site_id", siteId)
    .eq("user_id", actor.uid)
    .maybeSingle();
  return !!assigned;
}

/** Same company, or linked (subcontractor or assignment) to at least one of that company's sites. */
async function canSeeCompany(actor: Actor, companyId: string): Promise<boolean> {
  if (actor.companyId && actor.companyId === companyId) return true;
  const { data: sites } = await supabaseAdmin.from("sites").select("id").eq("company_id", companyId);
  const siteIds = ((sites ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (siteIds.length === 0) return false;
  if (actor.companyId) {
    const { data: subs } = await supabaseAdmin
      .from("site_subcontractors")
      .select("site_id")
      .eq("company_id", actor.companyId)
      .in("site_id", siteIds)
      .limit(1);
    if (subs && subs.length > 0) return true;
  }
  const { data: assigned } = await supabaseAdmin
    .from("assigned_operatives")
    .select("id")
    .eq("user_id", actor.uid)
    .in("site_id", siteIds)
    .limit(1);
  return !!assigned && assigned.length > 0;
}

async function canSeeCompanyRecord(actor: Actor, table: "assets" | "tasks", id: string): Promise<boolean> {
  const { data: row } = await supabaseAdmin.from(table).select("company_id, site_id").eq("id", id).maybeSingle();
  if (!row) return false;
  if (actor.companyId && row.company_id === actor.companyId) return true;
  return row.site_id ? canSeeSite(actor, String(row.site_id)) : false;
}

export type StorageAccess = { ok: true } | { ok: false; status: number };

/**
 * Whether the verified caller may read `bucket/path`.
 * - Per-user files: `authorizeActingOnUser` (own file, same-company admin / supervisor / site_admin / sub_admin, superuser).
 * - Signatures: the signer, a manager role of the company in the path, or a superuser.
 * - Company, site, asset and task files: members of that company, or users linked to the site.
 */
export async function authorizeStorageRead(req: Request, bucket: string, path: string): Promise<StorageAccess> {
  const scope = storageScope(bucket, path);
  if (!scope) return { ok: false, status: 403 };

  if (scope.kind === "user") {
    const access = await authorizeActingOnUser(req, scope.userId);
    if (access.ok) return { ok: true };
    return { ok: false, status: access.response.status === 401 ? 401 : 403 };
  }

  const access = await authorizeActingOnUser(req, null);
  if (!access.ok) return { ok: false, status: access.response.status === 401 ? 401 : 403 };
  const actor = access.actor;
  if (isSuperuser(actor)) return { ok: true };

  let allowed = false;
  switch (scope.kind) {
    case "signature":
      allowed =
        scope.userId === actor.uid ||
        (SAME_COMPANY_MANAGER_ROLES.has((actor.role ?? "").toLowerCase()) && !!actor.companyId && actor.companyId === scope.companyId);
      break;
    case "company":
      allowed = await canSeeCompany(actor, scope.companyId);
      break;
    case "site":
      allowed = await canSeeSite(actor, scope.siteId);
      break;
    case "asset":
      allowed = await canSeeCompanyRecord(actor, "assets", scope.assetId);
      break;
    case "task":
      allowed = await canSeeCompanyRecord(actor, "tasks", scope.taskId);
      break;
    case "unscoped":
      allowed = true;
      break;
  }
  return allowed ? { ok: true } : { ok: false, status: 403 };
}
