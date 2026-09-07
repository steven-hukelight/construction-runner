import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export type MobileApiAuth = {
  uid: string | null;
  role: string | null;
  companyId: string | null;
  userEmail: string | null;
  isSuperuser: boolean;
};

export async function resolveMobileApiAuth(req: Request): Promise<MobileApiAuth> {
  const cookieStore = await cookies();
  const queryCompanyId =
    new URL(req.url).searchParams.get("companyId")?.trim() || null;

  const cookieUid = cookieStore.get("uid")?.value?.trim() ?? null;
  const cookieRole = cookieStore.get("role")?.value ?? null;
  const cookieCompanyId =
    cookieStore.get("companyId")?.value ??
    cookieStore.get("company_id")?.value ??
    null;
  const cookieUserEmail = cookieStore.get("user_email")?.value ?? null;

  if (cookieUid || cookieRole || cookieUserEmail) {
    const resolvedCookieCompanyId =
      cookieRole === "superuser"
        ? queryCompanyId ?? cookieCompanyId
        : cookieCompanyId ??
          (await resolveCompanyId({
            cookieCompanyId: cookieCompanyId ?? undefined,
            userEmail: cookieUserEmail ?? undefined,
            role: cookieRole ?? undefined,
            queryCompanyId: queryCompanyId ?? undefined,
          })) ??
            null;

    return {
      uid: cookieUid,
      role: cookieRole,
      companyId: resolvedCookieCompanyId,
      userEmail: cookieUserEmail,
      isSuperuser: (cookieRole ?? "").toLowerCase() === "superuser",
    };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return {
      uid: null,
      role: null,
      companyId: null,
      userEmail: null,
      isSuperuser: false,
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      uid: null,
      role: null,
      companyId: null,
      userEmail: null,
      isSuperuser: false,
    };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return {
        uid: null,
        role: null,
        companyId: null,
        userEmail: null,
        isSuperuser: false,
      };
    }

    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("id, company_id, role, email")
      .eq("id", user.id)
      .maybeSingle();

    const role = (dbUser?.role as string | undefined) ?? null;
    const companyId =
      (dbUser?.company_id as string | undefined | null) ?? null;
    const isSuperuser = (role ?? "").toLowerCase() === "superuser";

    return {
      uid: (dbUser?.id as string | undefined) ?? user.id,
      role,
      companyId: isSuperuser ? queryCompanyId ?? companyId : companyId,
      userEmail:
        (dbUser?.email as string | undefined) ?? user.email ?? null,
      isSuperuser,
    };
  } catch {
    return {
      uid: null,
      role: null,
      companyId: null,
      userEmail: null,
      isSuperuser: false,
    };
  }
}
