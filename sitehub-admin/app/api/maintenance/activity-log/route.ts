import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Returns recent activity for superuser. */
export async function GET() {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const logs: { id: string; time: string; level: string; message: string; source?: string }[] = [];

    try {
      const { data: audit } = await supabaseAdmin
        .from("audit_logs")
        .select("id, action, user_id, actor_id, actor_email, timestamp")
        .order("timestamp", { ascending: false })
        .limit(30);
      (audit ?? []).forEach((row) => {
        logs.push({
          id: `audit-${row.id}`,
          time: typeof row.timestamp === "string" ? row.timestamp : new Date().toISOString(),
          level: "info",
          message: `${row.action ?? "unknown"}: user ${(row as { user_id?: string }).user_id} by ${(row as { actor_email?: string }).actor_email ?? (row as { actor_id?: string }).actor_id}`,
          source: "auditLogs",
        });
      });
    } catch {
      // ignore
    }

    try {
      const { data: sysLogs } = await supabaseAdmin
        .from("system_logs")
        .select("id, level, message, source, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      (sysLogs ?? []).forEach((row) => {
        logs.push({
          id: `sys-${(row as { id: string }).id}`,
          time: typeof (row as { created_at?: string }).created_at === "string"
            ? (row as { created_at: string }).created_at
            : new Date().toISOString(),
          level: ((row as { level?: string }).level ?? "info").toLowerCase(),
          message: (row as { message: string }).message ?? "",
          source: (row as { source?: string }).source ?? "system_logs",
        });
      });
    } catch {
      // ignore
    }

    try {
      const { data: regs } = await supabaseAdmin
        .from("registrations")
        .select("id, data, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      (regs ?? []).forEach((row) => {
        const d = (row.data ?? {}) as { email?: string; status?: string };
        logs.push({
          id: `reg-${row.id}`,
          time: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
          level: "info",
          message: `Registration: ${d.email ?? "unknown"} — ${d.status ?? "pending"}`,
          source: "registrations",
        });
      });
    } catch {
      // ignore
    }

    logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return NextResponse.json(logs.slice(0, 50));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/maintenance/activity-log failed:", message);
    return NextResponse.json([], { status: 200 });
  }
}
