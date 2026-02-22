import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl } from "@/lib/url";

function generateInviteCode(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const companyId = cookieStore.get("companyId")?.value;

    if (role !== "sub_admin" || !companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const name = body.name?.trim();
    const email = body.email?.trim();
    if (!name || !email) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

    const { data: company } = await supabaseAdmin.from("companies").select("invite_code").eq("id", companyId).maybeSingle();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    let inviteCode = company.invite_code?.trim();
    if (!inviteCode) {
      inviteCode = generateInviteCode();
      await supabaseAdmin.from("companies").update({ invite_code: inviteCode, updated_at: new Date().toISOString() }).eq("id", companyId);
    }

    const baseUrl = getBaseUrl();
    const inviteLink = `${baseUrl}/register?companyCode=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;

    return NextResponse.json({
      success: true,
      inviteLink,
      message: "Share this link with the operative. They will register and be linked to your company.",
    });
  } catch (e) {
    console.error("POST /api/subcontractor/invite-operative:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
