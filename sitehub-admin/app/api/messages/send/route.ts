import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("uid")?.value?.trim();
    const userEmail = cookieStore.get("user_email")?.value?.trim();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value?.trim();
    const queryCompanyId = new URL(req.url).searchParams.get("companyId")?.trim() || undefined;

    if (!uid && !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId = uid ?? null;
    if (!userId && userEmail) {
      const { data } = await supabaseAdmin.from("users").select("id, company_id").eq("email", userEmail).maybeSingle();
      userId = (data as { id?: string } | null)?.id ?? null;
      if (!companyId && data) companyId = (data as { company_id?: string }).company_id ?? "";
    }
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    if (!companyId) {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail,
          role,
          queryCompanyId,
        })) || "";
    }
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const threadId = body?.thread_id ?? body?.threadId;
    const messageBody = String(body?.body ?? "").trim();
    const attachmentUrl = body?.attachment_url ?? body?.attachmentUrl ?? null;

    if (!threadId || !messageBody) {
      return NextResponse.json({ error: "thread_id and body required" }, { status: 400 });
    }

    const { data: thread } = await supabaseAdmin
      .from("message_threads")
      .select("company_id")
      .eq("id", threadId)
      .maybeSingle();
    if (!thread || (thread as { company_id: string }).company_id !== companyId) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { data: inThread } = await supabaseAdmin
      .from("message_recipients")
      .select("user_id")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!inThread) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("messages_thread")
      .insert({ thread_id: threadId, sender_id: userId, body: messageBody, attachment_url: attachmentUrl })
      .select("id")
      .single();

    if (error) {
      console.error("POST /api/messages/send failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/messages/send failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
