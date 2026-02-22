import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/** Clear all rows from system_logs. Superuser only. Logs action in audit_logs. */
export async function POST() {
  try {
    const role = (await cookies()).get("role")?.value?.toLowerCase();
    const actorId = (await cookies()).get("uid")?.value?.trim();
    const actorEmail = (await cookies()).get("user_email")?.value?.trim();

    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("system_logs")
      .delete()
      .gte("created_at", "1970-01-01");

    if (error) {
      console.error("Clear system_logs failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog({
      userId: actorId ?? "system",
      action: "clear_system_logs",
      timestamp: new Date(),
      actorId: actorId ?? "system",
      actorEmail: actorEmail ?? null,
      metadata: { source: "system_logs_clear" },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/system-logs/clear failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
