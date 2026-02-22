import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureAdminAccess(companyId: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  const userEmail = cookieStore.get("user_email")?.value;
  let effectiveCompanyId = cookieStore.get("companyId")?.value?.trim();

  if (!effectiveCompanyId && role !== "superuser") {
    effectiveCompanyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
      })) || undefined;
  }

  const canDelete = ["admin", "superuser", "supervisor", "sub_admin"].includes(role);
  if (!canDelete) return NextResponse.json({ error: "Forbidden: admin or supervisor required" }, { status: 403 });
  if (role !== "superuser" && effectiveCompanyId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; messageId: string }> }
) {
  try {
    const { companyId, messageId } = await params;
    const err = await ensureAdminAccess(companyId);
    if (err) return err;

    const { data: msg } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("id", messageId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const { error: delErr } = await supabaseAdmin.from("messages").delete().eq("id", messageId);
    if (delErr) {
      console.error("DELETE /api/companies/[companyId]/messages/[messageId] failed:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/companies/[companyId]/messages/[messageId] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
