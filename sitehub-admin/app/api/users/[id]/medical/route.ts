import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cid(u: { company_id?: string | null }): string {
  return String(u.company_id ?? "").trim();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const companyId = cookieStore.get("companyId")?.value;
    const userEmail = cookieStore.get("user_email")?.value;

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userCompanyId = cid(userRow);
    const roleLower = (role ?? "").toLowerCase();
    const isSuperuser = roleLower === "superuser";
    let cookieCompanyId = (companyId ?? "").trim();

    if (!cookieCompanyId && userEmail) {
      const { data: me } = await supabaseAdmin.from("users").select("company_id").eq("email", userEmail.trim()).limit(1).maybeSingle();
      if (me) cookieCompanyId = cid(me as { company_id?: string | null });
    }

    let isOwnProfile = false;
    if (userEmail) {
      const { data: me } = await supabaseAdmin.from("users").select("id").eq("email", userEmail.trim()).limit(1).maybeSingle();
      if (me?.id === id) isOwnProfile = true;
    }

    const sameCompany = cookieCompanyId && cookieCompanyId === userCompanyId;
    const canAccess = isSuperuser || isOwnProfile || sameCompany;
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: records } = await supabaseAdmin
      .from("medical_records")
      .select("id, title, notes, file_name, file_url, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json(records ?? []);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
