import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { sendPushToUsers } from "@/lib/onesignal";

async function ensureCookieAccess(req: Request): Promise<{
  companyId: string;
  userId: string;
  role: string | undefined;
  error: NextResponse | null;
}> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value?.trim();
  const userEmail = cookieStore.get("user_email")?.value?.trim();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value?.trim();
  const queryCompanyId = new URL(req.url).searchParams.get("companyId")?.trim() || undefined;

  if (!uid && !userEmail) {
    return { companyId: "", userId: "", role: undefined, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let userId = uid ?? null;
  if (!userId && userEmail) {
    const { data } = await supabaseAdmin.from("users").select("id, company_id").eq("email", userEmail).maybeSingle();
    userId = (data as { id?: string } | null)?.id ?? null;
    if (!companyId && data) companyId = (data as { company_id?: string }).company_id ?? "";
  }
  if (!userId) return { companyId: "", userId: "", role, error: NextResponse.json({ error: "User not found" }, { status: 401 }) };

  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
        queryCompanyId,
      })) || "";
  }
  if (!companyId) {
    return { companyId: "", userId, role, error: NextResponse.json({ error: "Company required" }, { status: 400 }) };
  }
  return { companyId, userId, role, error: null };
}

/** Prefer Bearer (mobile); fall back to session cookies (web). */
async function resolveSendAuth(req: Request): Promise<{
  companyId: string;
  userId: string;
  role: string | undefined;
  error: NextResponse | null;
}> {
  const auth = await resolveMobileApiAuth(req);
  const queryCompanyId = new URL(req.url).searchParams.get("companyId")?.trim() || undefined;

  if (auth.uid) {
    let companyId = (auth.companyId ?? "").trim();
    if (auth.isSuperuser && queryCompanyId) {
      companyId = queryCompanyId;
    }
    if (!companyId) {
      return {
        companyId: "",
        userId: auth.uid,
        role: auth.role ?? undefined,
        error: NextResponse.json({ error: "Company required" }, { status: 400 }),
      };
    }
    return { companyId, userId: auth.uid, role: auth.role ?? undefined, error: null };
  }

  return ensureCookieAccess(req);
}

export async function POST(req: Request) {
  try {
    const { companyId, userId, role, error } = await resolveSendAuth(req);
    if (error) return error;

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

    const roleLower = (role ?? "").toLowerCase();
    const isAdminOrSupervisor = ["admin", "supervisor", "sub_admin", "superuser"].includes(roleLower);

    if (!inThread) {
      if (isAdminOrSupervisor && (thread as { company_id: string }).company_id === companyId) {
        await supabaseAdmin.from("message_recipients").upsert(
          { thread_id: threadId, user_id: userId },
          { onConflict: "thread_id,user_id" }
        );
      } else {
        return NextResponse.json({ error: "Not a participant" }, { status: 403 });
      }
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("messages_thread")
      .insert({ thread_id: threadId, sender_id: userId, body: messageBody, attachment_url: attachmentUrl })
      .select("id")
      .single();

    if (insertError) {
      console.error("POST /api/messages/send failed:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: recipientRows } = await supabaseAdmin
      .from("message_recipients")
      .select("user_id")
      .eq("thread_id", threadId);

    const recipientList = Array.isArray(recipientRows) ? recipientRows : [];
    const pushUserIds = recipientList
      .map((r) => (r as { user_id: string }).user_id)
      .filter((id) => id && id !== userId);

    if (pushUserIds.length > 0) {
      let senderLabel = "Someone";
      const { data: senderRow } = await supabaseAdmin
        .from("users")
        .select("name, display_name, email")
        .eq("id", userId)
        .maybeSingle();
      if (senderRow) {
        const u = senderRow as { name?: string | null; display_name?: string | null; email?: string | null };
        const label =
          [u.name, u.display_name, u.email?.split("@")[0] ?? ""].find((s) => s && String(s).trim()) ?? "";
        senderLabel = String(label).trim() || "Someone";
      }

      const preview =
        (attachmentUrl ? "Attachment · " : "") +
        (messageBody.length > 140 ? `${messageBody.slice(0, 140)}…` : messageBody);

      sendPushToUsers(pushUserIds, `New message from ${senderLabel}`, preview, {
        type: "message",
        screen: "messaging",
        threadId: String(threadId),
        messageId: String(data?.id ?? ""),
      }).catch((e) => console.error("Message push failed:", e));
    }

    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/messages/send failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
