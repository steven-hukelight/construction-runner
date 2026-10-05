import { authorizeActingOnUser } from "@/lib/auth/actingOnUser";

/**
 * Same rule as `authorizeActingOnUser`: the caller's own record, a superuser, or an
 * admin / supervisor / site_admin / sub_admin of the target user's company.
 */
export async function checkPreInductionAccess(
  userId: string,
  req: Request,
): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (!userId.trim()) return { ok: false, error: "Missing userId", status: 400 };
  const access = await authorizeActingOnUser(req, userId);
  if (access.ok) return { ok: true };
  const body = (await access.response.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: body.error ?? "Forbidden", status: access.response.status };
}
