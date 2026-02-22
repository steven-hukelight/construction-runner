import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SECTION_TO_TABLE: Record<string, string> = {
  rightToWork: "pre_induction_right_to_work",
  certifications: "pre_induction_certifications",
  medical: "pre_induction_medical",
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const companyId = cookieStore.get("companyId")?.value;

    if (role !== "sub_admin" || !companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const userId = body.userId?.trim();
    const section = body.section?.trim();
    if (!userId || !section) return NextResponse.json({ error: "userId and section required" }, { status: 400 });

    const validSections = ["rightToWork", "certifications", "medical"];
    if (!validSections.includes(section)) return NextResponse.json({ error: "Invalid section" }, { status: 400 });

    const { data: user } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if ((user.company_id ?? "") !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const table = SECTION_TO_TABLE[section];
    if (!table) return NextResponse.json({ error: "Invalid section" }, { status: 400 });

    const { data: row } = await supabaseAdmin.from(table).select("data").eq("user_id", userId).maybeSingle();
    const existing = ((row as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;
    const merged = {
      ...existing,
      verificationRequestedAt: new Date().toISOString(),
      verificationRequestedBy: companyId,
      verificationStatus: "pending",
    };

    await supabaseAdmin.from(table).upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/subcontractor/request-verification:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
