import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureAdminAccess(req?: Request): Promise<{ companyId: string; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value?.trim();
  const userEmail = cookieStore.get("user_email")?.value?.trim();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  let companyId = cookieStore.get("companyId")?.value?.trim();
  const queryCompanyId = req ? new URL(req.url).searchParams.get("companyId")?.trim() || undefined : undefined;

  if (!uid && !userEmail) {
    return { companyId: "", error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!companyId && userEmail) {
    const { data } = await supabaseAdmin.from("users").select("company_id").eq("email", userEmail).maybeSingle();
    if (data) companyId = (data as { company_id?: string }).company_id ?? "";
  }
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
        queryCompanyId,
      })) || "";
  }
  const canDelete = ["admin", "superuser", "supervisor", "sub_admin"].includes(role);
  if (!canDelete) {
    return { companyId: "", error: NextResponse.json({ error: "Forbidden: admin or supervisor required" }, { status: 403 }) };
  }
  return { companyId, error: null };
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: threadId, messageId } = await params;
    const { companyId, error } = await ensureAdminAccess(req);
    if (error) return error;
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { data: thread } = await supabaseAdmin
      .from("message_threads")
      .select("company_id")
      .eq("id", threadId)
      .maybeSingle();
    if (!thread || (thread as { company_id: string }).company_id !== companyId) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { data: msg } = await supabaseAdmin
      .from("messages_thread")
      .select("id")
      .eq("id", messageId)
      .eq("thread_id", threadId)
      .maybeSingle();
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const { error: delErr } = await supabaseAdmin.from("messages_thread").delete().eq("id", messageId);
    if (delErr) {
      console.error("DELETE message failed:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/messages/thread/[id]/message/[messageId] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
