import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { bearerTokenFrom, expectedRoleCookie, verifyApiCredentials } from "@/lib/auth/apiAuth";

export type MobileApiAuth = {
  uid: string | null;
  role: string | null;
  companyId: string | null;
  userEmail: string | null;
  isSuperuser: boolean;
};

/**
 * Resolves the caller from a verified web session (`session_id` cookie) or a
 * Supabase Bearer token (Flutter). Fails closed: returns a 401 response when no
 * user can be established, so callers must `if (auth instanceof NextResponse) return auth;`.
 */
export async function resolveMobileApiAuth(req: Request): Promise<MobileApiAuth | NextResponse> {
  const cookieStore = await cookies();
  const queryCompanyId = new URL(req.url).searchParams.get("companyId")?.trim() || null;

  const cookieUid = cookieStore.get("uid")?.value?.trim() || null;
  const cookieRole = cookieStore.get("role")?.value || null;
  const cookieCompanyId =
    cookieStore.get("companyId")?.value ?? cookieStore.get("company_id")?.value ?? null;
  const cookieUserEmail = cookieStore.get("user_email")?.value || null;

  const outcome = await verifyApiCredentials({
    sessionId: cookieStore.get("session_id")?.value ?? null,
    bearerToken: bearerTokenFrom(req.headers.get("authorization")),
    cookieUid,
    cookieRole,
    cookieCompanyId,
    cookieEmail: cookieUserEmail,
  });
  if (!outcome.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = outcome.user;

  if (cookieUid || cookieRole || cookieUserEmail) {
    const role = cookieRole ?? expectedRoleCookie(user);
    const isSuperuser = role.toLowerCase() === "superuser";
    const companyId = isSuperuser
      ? queryCompanyId ?? cookieCompanyId
      : cookieCompanyId ??
        user.dbCompanyId ??
        (await resolveCompanyId({
          cookieCompanyId: undefined,
          userEmail: cookieUserEmail ?? user.dbEmail ?? undefined,
          role,
          queryCompanyId: queryCompanyId ?? undefined,
        })) ??
        null;
    return {
      uid: user.uid,
      role,
      companyId,
      userEmail: cookieUserEmail ?? user.dbEmail,
      isSuperuser,
    };
  }

  return {
    uid: user.uid,
    role: user.dbRole,
    companyId: user.isSuperuser ? queryCompanyId ?? user.dbCompanyId : user.dbCompanyId,
    userEmail: user.dbEmail ?? user.authEmail,
    isSuperuser: user.isSuperuser,
  };
}
