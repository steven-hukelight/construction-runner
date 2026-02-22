import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/auditLog";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    const email = cookieStore.get("user_email")?.value;

    const canSelfOverride = roleLower === "superuser" || roleLower === "admin" || roleLower === "sub_admin";
    if (!canSelfOverride) {
      return NextResponse.json(
        { error: "Only superuser or company admin can apply self-override for inductions" },
        { status: 403 }
      );
    }

    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: users } = await supabaseAdmin.from("users").select("id").eq("email", email).limit(1);
    if (!users || users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const docId = users[0].id;
    const userId = docId;

    const body = await req.json();
    const adminPreInductionOverride = !!body.adminPreInductionOverride;

    await supabaseAdmin.from("users").update({
      admin_pre_induction_override: adminPreInductionOverride,
    }).eq("id", docId);

    await writeAuditLog({
      userId,
      action: "override_pre_induction",
      timestamp: new Date(),
      actorId: userId,
      actorEmail: email,
      metadata: { adminPreInductionOverride },
    });

    return NextResponse.json({ success: true, adminPreInductionOverride });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("POST pre-induction me/override:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
