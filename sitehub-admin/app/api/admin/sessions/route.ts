/**
 * GET /api/admin/sessions
 * List active sessions for the current user. Admin/superuser only.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listActiveSessions } from "@/lib/sessions";

export async function GET() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "superuser" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sessions = await listActiveSessions(uid);
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceType: s.device_type,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        createdAt: s.created_at,
        lastActiveAt: s.last_active_at,
      })),
    });
  } catch (e) {
    console.error("List sessions failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
