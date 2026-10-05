import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth, type MobileApiAuth } from "@/app/api/_utils/mobileAuth";

/** Roles that may act on another user's record when both belong to the same company. */
export const SAME_COMPANY_MANAGER_ROLES = new Set(["admin", "supervisor", "site_admin", "sub_admin"]);

export type ActingOnUserResult =
  | { ok: true; actor: MobileApiAuth & { uid: string }; targetUserId: string; isSelf: boolean }
  | { ok: false; response: NextResponse };

/**
 * Authorizes the verified caller to act on `requestedUserId`.
 * - Omitted or equal to the caller's id → the caller's own record (`targetUserId` is the verified uid).
 * - Superuser → any user.
 * - admin / supervisor / site_admin / sub_admin → users whose `users.company_id` equals the caller's company.
 * - Anyone else → 403.
 */
export async function authorizeActingOnUser(
  req: Request,
  requestedUserId?: string | null
): Promise<ActingOnUserResult> {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return { ok: false, response: auth };
  if (!auth.uid) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const actor = { ...auth, uid: auth.uid };

  const requested = requestedUserId?.trim() || actor.uid;
  if (requested === actor.uid) {
    return { ok: true, actor, targetUserId: actor.uid, isSelf: true };
  }

  const role = (actor.role ?? "").toLowerCase();
  if (actor.isSuperuser || role === "superuser") {
    return { ok: true, actor, targetUserId: requested, isSelf: false };
  }

  const forbidden = { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (!SAME_COMPANY_MANAGER_ROLES.has(role) || !actor.companyId) return forbidden;

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("company_id")
    .eq("id", requested)
    .maybeSingle();
  if (!target) {
    return { ok: false, response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  if ((target.company_id ?? null) !== actor.companyId) return forbidden;

  return { ok: true, actor, targetUserId: requested, isSelf: false };
}
