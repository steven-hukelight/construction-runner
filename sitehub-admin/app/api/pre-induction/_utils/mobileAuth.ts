import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PreInductionAuth = {
  uid: string | null;
  role: string | null;
  companyId: string | null;
  userEmail: string | null;
};

/**
 * Resolve auth for pre-induction API routes. Supports:
 * 1. Cookie-based auth (web dashboard)
 * 2. Bearer token (mobile app - Authorization: Bearer <supabase_access_token>)
 * 3. Fallback uid in body/query for mobile when cookies not sent
 */
export async function resolvePreInductionAuth(params: {
  req: Request;
  uidFromBody?: string | null;
  uidFromQuery?: string | null;
}): Promise<PreInductionAuth> {
  const cookieStore = await cookies();
  let uid = cookieStore.get("uid")?.value?.trim() ?? null;
  const role = cookieStore.get("role")?.value ?? null;
  const companyId = cookieStore.get("companyId")?.value ?? cookieStore.get("company_id")?.value ?? null;
  const userEmail = cookieStore.get("user_email")?.value ?? null;

  // Mobile may pass uid in body/query when viewing own docs
  if (!uid && params.uidFromBody) uid = params.uidFromBody;
  if (!uid && params.uidFromQuery) uid = params.uidFromQuery;

  // If we have cookies, use them
  if (uid || role || userEmail) {
    return { uid, role, companyId, userEmail };
  }

  // Try Bearer token (mobile app with Supabase session)
  const authHeader = params.req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) return { uid: null, role: null, companyId: null, userEmail: null };
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return { uid: null, role: null, companyId: null, userEmail: null };
      const authUid = user.id;
      const { data: dbUser } = await supabaseAdmin
        .from("users")
        .select("id, company_id, role")
        .eq("id", authUid)
        .maybeSingle();
      if (!dbUser) return { uid: authUid, role: null, companyId: null, userEmail: user.email ?? null };
      return {
        uid: (dbUser as { id?: string }).id ?? authUid,
        role: (dbUser as { role?: string }).role ?? null,
        companyId: (dbUser as { company_id?: string | null }).company_id ?? null,
        userEmail: user.email ?? null,
      };
    } catch {
      return { uid: null, role: null, companyId: null, userEmail: null };
    }
  }

  return { uid: null, role: null, companyId: null, userEmail: null };
}
