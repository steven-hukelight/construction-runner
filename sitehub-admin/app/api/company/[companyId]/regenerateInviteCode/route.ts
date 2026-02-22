import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function generateInviteCode(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

export async function POST(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    const cookieCompanyId = cookieStore.get("companyId")?.value?.trim();

    const isSuperuser = role === "superuser";
    const isAdmin = role === "admin" || role === "sub_admin";
    if (!isSuperuser && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isSuperuser && isAdmin) {
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

    const newCode = generateInviteCode();
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ invite_code: newCode, updated_at: new Date().toISOString() })
      .eq("id", companyId);
    if (error) {
      console.error("regenerateInviteCode update error:", error);
      return NextResponse.json({ error: "Failed to update invite code" }, { status: 500 });
    }
    return NextResponse.json({ inviteCode: newCode });
  } catch (e) {
    console.error("regenerateInviteCode:", e);
    return NextResponse.json({ inviteCode: null }, { status: 500 });
  }
}
