/**
 * GDPR Right to Erasure - Delete Account
 * Anonymises user and deletes personal data; RETAINS H&S records.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId as string | undefined;
    const confirm = body.confirm === true || body.confirm === "true";

    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value;
    const role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    const companyId = cookieStore.get("companyId")?.value;

    if (!email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: me } = await supabaseAdmin.from("users").select("id, email").eq("email", email).limit(1).maybeSingle();
    const actorId = me?.id ?? "unknown";
    const actorEmail = me?.email ?? undefined;

    const userId = targetUserId ?? actorId;
    const isSelf = userId === actorId;

    if (isSelf) {
      if (!confirm) {
        return NextResponse.json({ error: "Confirm deletion by sending { confirm: true }" }, { status: 400 });
      }
    } else {
      if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "sub_admin") {
        return NextResponse.json({ error: "Only admin can delete other users" }, { status: 403 });
      }
      const { data: target } = await supabaseAdmin.from("users").select("id, company_id").eq("id", userId).maybeSingle();
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (roleLower !== "superuser" && (target.company_id ?? "") !== (companyId ?? "")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await Promise.all([
      supabaseAdmin.from("pre_induction_personal").delete().eq("user_id", userId),
      supabaseAdmin.from("pre_induction_right_to_work").delete().eq("user_id", userId),
      supabaseAdmin.from("pre_induction_certifications").delete().eq("user_id", userId),
      supabaseAdmin.from("pre_induction_medical").delete().eq("user_id", userId),
      supabaseAdmin.from("pre_induction_training").delete().eq("user_id", userId),
      supabaseAdmin.from("pre_induction_declarations").delete().eq("user_id", userId),
    ]);

    await supabaseAdmin.from("users").update({
      email: `deleted-${userId}@gdpr.local`,
      display_name: "[Deleted]",
      phone: null,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);

    await writeAuditLog({
      userId,
      action: "gdpr_erasure",
      timestamp: new Date(),
      actorId,
      actorEmail,
      metadata: { isSelf, retainedInductions: true, retainedRams: true, retainedTraining: true },
    });

    return NextResponse.json({
      success: true,
      message: "Account data deleted. H&S records (inductions, RAMS acceptance, training) retained for legal compliance.",
    });
  } catch (e) {
    console.error("GDPR delete-account:", e);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
