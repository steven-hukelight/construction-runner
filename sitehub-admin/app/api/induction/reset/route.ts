import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/auditLog";

/** Deletes user's site induction. Admin/same company or superuser only. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
    if (!userId || !siteId) return NextResponse.json({ error: "userId and siteId required" }, { status: 400 });

    const role = (await cookies()).get("role")?.value;
    const companyId = (await cookies()).get("companyId")?.value;

    let canProceed = false;
    if (role === "superuser") canProceed = true;
    else if (companyId && (role === "admin" || role === "ADMIN" || role === "supervisor" || role === "SUPERVISOR")) {
      const { data: user } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).maybeSingle();
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if ((user.company_id ?? "") === companyId) canProceed = true;
    }

    if (!canProceed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await supabaseAdmin.from("user_site_inductions").delete().eq("user_id", userId).eq("site_id", siteId);

    const cookieStore = await cookies();
    await writeAuditLog({
      userId,
      action: "reset_induction",
      timestamp: new Date(),
      actorId: cookieStore.get("uid")?.value ?? "unknown",
      actorEmail: cookieStore.get("user_email")?.value ?? null,
      metadata: { siteId },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/induction/reset failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
