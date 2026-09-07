import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

async function ensureAccess(req?: Request): Promise<{ companyId: string; userId: string; role: string | undefined; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value?.trim();
  const userEmail = cookieStore.get("user_email")?.value?.trim();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value?.trim();
  const queryCompanyId = req ? new URL(req.url).searchParams.get("companyId")?.trim() || undefined : undefined;

  if (!uid && !userEmail) {
    return { companyId: "", userId: "", role: undefined, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let userId = uid ?? null;
  if (!userId && userEmail) {
    const { data } = await supabaseAdmin.from("users").select("id, company_id").eq("email", userEmail).maybeSingle();
    if (data) {
      userId = (data as { id: string }).id;
      if (!companyId) companyId = (data as { company_id?: string }).company_id ?? "";
    }
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
  return { companyId, userId, role, error: null };
}

/** Prefer Bearer (mobile); fall back to session cookies (web). */
async function resolveThreadAuth(req: Request): Promise<{
  companyId: string;
  userId: string;
  role: string | undefined;
  error: NextResponse | null;
}> {
  const auth = await resolveMobileApiAuth(req);
  const url = new URL(req.url);
  const queryCompanyId = url.searchParams.get("companyId")?.trim() || undefined;

  if (auth.uid) {
    let companyId = (auth.companyId ?? "").trim();
    if (auth.isSuperuser && queryCompanyId) {
      companyId = queryCompanyId;
    }
    if (!companyId) {
      return { companyId: "", userId: auth.uid, role: auth.role ?? undefined, error: null };
    }
    return { companyId, userId: auth.uid, role: auth.role ?? undefined, error: null };
  }

  return ensureAccess(req);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { companyId, userId, role, error } = await resolveThreadAuth(req);
    if (error) return error;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { data: thread } = await supabaseAdmin
      .from("message_threads")
      .select("id, created_by, company_id, created_at")
      .eq("id", id)
      .single();

    if (!thread || (thread as { company_id: string }).company_id !== companyId) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { data: inThread } = await supabaseAdmin
      .from("message_recipients")
      .select("user_id")
      .eq("thread_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    const roleLower = (role ?? "").toLowerCase();
    const isAdminOrSupervisor = ["admin", "supervisor", "sub_admin", "superuser"].includes(roleLower);

    const upsertRow = { thread_id: id, user_id: userId, last_read_at: new Date().toISOString() };
    const upsertFallback = { thread_id: id, user_id: userId };
    const doUpsert = async () => {
      const { error } = await supabaseAdmin.from("message_recipients").upsert(upsertRow, { onConflict: "thread_id,user_id" });
      if (error) {
        await supabaseAdmin.from("message_recipients").upsert(upsertFallback, { onConflict: "thread_id,user_id" });
      }
    };
    if (!inThread) {
      if (isAdminOrSupervisor && companyId && (thread as { company_id: string }).company_id === companyId) {
        await doUpsert();
      } else {
        return NextResponse.json({ error: "Not a participant" }, { status: 403 });
      }
    } else {
      await doUpsert();
    }

    let recipients: Array<{ user_id: string; last_read_at?: string | null }> = [];
    const { data: recData, error: recErr } = await supabaseAdmin
      .from("message_recipients")
      .select("user_id, last_read_at")
      .eq("thread_id", id);
    if (!recErr && recData) {
      recipients = recData as Array<{ user_id: string; last_read_at?: string | null }>;
    }

    const { data: messages } = await supabaseAdmin
      .from("messages_thread")
      .select("id, sender_id, body, attachment_url, created_at")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });

    const senderIds = [...new Set((messages ?? []).map((m) => (m as { sender_id: string }).sender_id))];
    const senderMap = new Map<string, string>();
    if (senderIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, name, display_name, email")
        .in("id", senderIds);
      for (const u of users ?? []) {
        const uid = (u as { id: string }).id;
        const name = (u as { name?: string }).name ?? (u as { display_name?: string }).display_name;
        const email = (u as { email?: string }).email;
        senderMap.set(uid, name ?? (email ? String(email).split("@")[0] : "Unknown"));
      }
    }

    const recs = recipients;
    const msgList = (messages ?? []) as Array<{ id: string; sender_id: string; body: string; attachment_url?: string | null; created_at: string }>;

    return NextResponse.json({
      thread: {
        id: (thread as { id: string }).id,
        createdBy: (thread as { created_by: string }).created_by,
        createdAt: (thread as { created_at: string }).created_at,
        archived: (thread as { archived?: boolean }).archived ?? false,
      },
      messages: msgList.map((m) => {
        const sid = m.sender_id;
        const msgTime = new Date(m.created_at).getTime();
        const others = recs.filter((r) => r.user_id !== sid);
        const read = others.length > 0 && others.every((r) => r.last_read_at && new Date(r.last_read_at).getTime() >= msgTime);
        return {
          id: m.id,
          senderId: sid,
          sender_name: senderMap.get(sid) ?? null,
          body: m.body,
          attachmentUrl: m.attachment_url ?? null,
          createdAt: m.created_at,
          read: sid === userId ? read : undefined,
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/messages/thread/[id] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
  if (!canDelete) return { companyId: "", error: NextResponse.json({ error: "Forbidden: admin or supervisor required" }, { status: 403 }) };
  return { companyId, error: null };
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { companyId, error } = await ensureAdminAccess(req);
    if (error) return error;
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { data: thread } = await supabaseAdmin
      .from("message_threads")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    if (!thread || (thread as { company_id: string }).company_id !== companyId) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { error: delErr } = await supabaseAdmin.from("message_threads").delete().eq("id", id);
    if (delErr) {
      console.error("DELETE /api/messages/thread/[id] failed:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/messages/thread/[id] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
