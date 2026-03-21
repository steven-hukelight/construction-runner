import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePreInductionAuth } from "../../_utils/mobileAuth";

export async function checkPreInductionAccess(
  userId: string,
  req?: Request,
): Promise<{ ok: boolean; error?: string; status?: number }> {
  let role: string | null = null;
  let companyId: string | null = null;
  let userEmail: string | null = null;
  let uid: string | null = null;

  if (req) {
    const auth = await resolvePreInductionAuth({ req });
    role = auth.role;
    companyId = auth.companyId;
    userEmail = auth.userEmail;
    uid = auth.uid;
  }
  if (!role && !userEmail && !uid) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    role = cookieStore.get("role")?.value ?? null;
    companyId = cookieStore.get("companyId")?.value ?? null;
    userEmail = cookieStore.get("user_email")?.value ?? null;
    uid = cookieStore.get("uid")?.value?.trim() ?? null;
  }

  if (!role && !userEmail && !uid) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  if (role === "superuser") {
    return { ok: true };
  }

  if (uid && uid === userId) {
    return { ok: true };
  }

  const { data: user } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).single();
  if (!user) {
    return { ok: false, error: "User not found", status: 404 };
  }

  const userCompanyId = (user.company_id ?? "") as string;

  if (userEmail) {
    const { data: me } = await supabaseAdmin.from("users").select("id").eq("email", userEmail.trim()).maybeSingle();
    if (me?.id === userId) return { ok: true };
  }

  if (companyId && companyId === userCompanyId) {
    return { ok: true };
  }

  return { ok: false, error: "Forbidden", status: 403 };
}
