import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Export audit logs as JSON. Superuser only. */
export async function GET(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") ?? "500", 10) || 500, 5000);

    const { data } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit);

    const logs = (data ?? []).map((row) => ({
      id: (row as { id?: string }).id,
      action: (row as { action?: string }).action,
      userId: (row as { user_id?: string }).user_id,
      actorId: (row as { actor_id?: string }).actor_id,
      actorEmail: (row as { actor_email?: string }).actor_email,
      timestamp: typeof (row as { timestamp?: string }).timestamp === "string" ? (row as { timestamp: string }).timestamp : null,
      metadata: (row as { metadata?: Record<string, unknown> }).metadata ?? {},
    }));

    return NextResponse.json({ logs, exportedAt: new Date().toISOString(), count: logs.length });
  } catch (e) {
    console.error("audit-log-export failed:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
