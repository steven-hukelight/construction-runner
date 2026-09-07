import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { ensureTaskReadAccess } from "@/app/api/tasks/_utils/taskAccess";

/** GET /api/tasks/[id]/comments */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const forbid = await ensureTaskReadAccess(_req, taskId);
  if (forbid) return forbid;

  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .select("id, user_id, body, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => (r as { user_id: string }).user_id))];
  const nameByUser: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, name, display_name, email")
      .in("id", userIds);
    for (const u of users ?? []) {
      const rec = u as { id: string; name?: string; display_name?: string; email?: string };
      nameByUser[rec.id] = (rec.display_name || rec.name || rec.email || rec.id).trim() || rec.id;
    }
  }

  return NextResponse.json(
    rows.map((r) => {
      const row = r as { id: string; user_id: string; body: string; created_at: string };
      return {
        ...row,
        author_name: nameByUser[row.user_id] ?? row.user_id,
      };
    })
  );
}

/** POST /api/tasks/[id]/comments */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const auth = await resolveMobileApiAuth(req);
  const forbid = await ensureTaskReadAccess(req, taskId);
  if (forbid) return forbid;

  if (!auth.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const text = body?.body != null ? String(body.body).trim() : "";
  if (!text) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .insert({ task_id: taskId, user_id: auth.uid, body: text })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id, created_at: data?.created_at }, { status: 201 });
}
