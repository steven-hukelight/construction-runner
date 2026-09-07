/**
 * DELETE /api/admin/sessions/:id
 * Revoke a session. Admin/superuser can revoke own sessions.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listActiveSessions, revokeSession } from "@/lib/sessions";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "superuser" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await listActiveSessions(uid);
  const ownsSession = sessions.some((s) => s.id === sessionId);
  if (!ownsSession) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
  }

  const ok = await revokeSession(sessionId);
  if (!ok) {
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
