import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import {
  ensureTaskWriteAccess,
  isStaffRole,
} from "@/app/api/tasks/_utils/taskAccess";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureTaskWriteAccess(req, id);
  if (forbid) return forbid;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const auth = await resolveMobileApiAuth(req);

  let hasField = false;
  if ("status" in body && body.status != null) {
    updates.status = body.status;
    hasField = true;
  }

  const dueRaw = body.due_date ?? body.dueDate;
  if (dueRaw !== undefined) {
    if (!isStaffRole(auth.role)) {
      return NextResponse.json({ error: "Only staff can set due date" }, { status: 403 });
    }
    const s = String(dueRaw).trim();
    updates.due_date = s.length === 0 ? null : s;
    hasField = true;
  }

  if (!hasField) {
    return NextResponse.json({ error: "status or due_date required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("tasks").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await ensureTaskWriteAccess(_req, id);
  if (forbid) return forbid;
  await supabaseAdmin.from("tasks").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
