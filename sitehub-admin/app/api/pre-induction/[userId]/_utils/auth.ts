import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function checkPreInductionAccess(userId: string): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  const userEmail = cookieStore.get("user_email")?.value;
  const uid = cookieStore.get("uid")?.value?.trim();

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
