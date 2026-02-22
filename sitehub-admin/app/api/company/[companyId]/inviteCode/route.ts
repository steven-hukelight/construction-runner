import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  try {
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    const cookieCompanyId = cookieStore.get("companyId")?.value?.trim();
    const isSuperuser = role === "superuser";
    const isAdmin = role === "admin" || role === "sub_admin" || role === "supervisor";
    if (!isSuperuser && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isSuperuser) {
      const userCompanyId = cookieCompanyId || (await (async () => {
        const email = cookieStore.get("user_email")?.value;
        if (!email) return null;
        const { data } = await supabaseAdmin.from("users").select("company_id").eq("email", email).maybeSingle();
        return data?.company_id ? String(data.company_id) : null;
      })());
      if (userCompanyId !== companyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const { data } = await supabaseAdmin.from("companies").select("invite_code").eq("id", companyId).single();
    const inviteCode = data?.invite_code ?? null;
    return NextResponse.json({ inviteCode });
  } catch (e) {
    console.error("inviteCode GET:", e);
    return NextResponse.json({ inviteCode: null }, { status: 500 });
  }
}
