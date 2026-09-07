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

  // Mobile superuser: companyId can come from query param (ApiClient adds ?companyId=...)
  const queryCompanyId = req ? new URL(req.url).searchParams.get("companyId")?.trim() || undefined : undefined;

  if (!uid && !userEmail) {
    return { companyId: "", userId: "", role: undefined, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let userId = uid ?? null;
  if (!userId && userEmail) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id, company_id")
      .eq("email", userEmail)
      .maybeSingle();
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
async function resolveThreadsAuth(req: Request): Promise<{
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

export async function GET(req: Request) {
  try {
    const { companyId, userId, role, error } = await resolveThreadsAuth(req);
    if (error) return error;
    if (!companyId) return NextResponse.json([], { status: 200 });

    const url = new URL(req.url);
    const mineOnly = url.searchParams.get("mine") === "true";

    let query = supabaseAdmin
      .from("message_threads")
      .select("id, created_by, site_id, created_at, archived")
      .eq("company_id", companyId)
      .not("archived", "eq", true)
      .order("created_at", { ascending: false });

    if (mineOnly) {
      query = query.eq("created_by", userId);
    }

    const { data: threads, error: threadsErr } = await query;

    if (threadsErr) {
      console.warn("GET /api/messages/threads:", threadsErr.message);
      return NextResponse.json([]);
    }

    const threadIds = (threads ?? []).map((t) => (t as { id: string }).id);
    if (threadIds.length === 0) return NextResponse.json([]);

    let recipientsData: Array<{ thread_id: string; user_id: string; last_read_at?: string | null }> = [];
    const { data: recipients, error: recErr } = await supabaseAdmin
      .from("message_recipients")
      .select("thread_id, user_id, last_read_at")
      .in("thread_id", threadIds);
    if (!recErr && recipients && Array.isArray(recipients)) {
      recipientsData = recipients as Array<{ thread_id: string; user_id: string; last_read_at?: string | null }>;
    } else if (recErr) {
      const { data: fallback } = await supabaseAdmin
        .from("message_recipients")
        .select("thread_id, user_id")
        .in("thread_id", threadIds);
      if (fallback && Array.isArray(fallback)) {
        recipientsData = fallback as Array<{ thread_id: string; user_id: string }>;
      }
    }

    const userInThread = new Set<string>();
    const userLastReadByThread = new Map<string, string>();
    for (const r of recipientsData) {
      if (r.user_id === userId) {
        userInThread.add(r.thread_id);
        if ("last_read_at" in r && r.last_read_at) userLastReadByThread.set(r.thread_id, r.last_read_at);
      }
    }

    const { data: lastMsgs, error: msgsErr } = await supabaseAdmin
      .from("messages_thread")
      .select("thread_id, body, created_at")
      .in("thread_id", threadIds);

    const byThread = new Map<string, { body: string; created_at: string }>();
    if (!msgsErr && lastMsgs) {
    for (const m of lastMsgs) {
      const tid = (m as { thread_id: string }).thread_id;
      const cur = byThread.get(tid);
      const ts = (m as { created_at: string }).created_at;
      if (!cur || ts > cur.created_at) {
        byThread.set(tid, { body: (m as { body: string }).body, created_at: ts });
      }
    }
    }

    const roleLower = (role ?? "").toLowerCase();
    const isAdminOrSupervisor = ["admin", "supervisor", "sub_admin", "superuser"].includes(roleLower);

    const list = (threads ?? [])
      .map((t) => {
        const o = t as { id: string; created_by: string; created_at: string };
        const inThread = userInThread.has(o.id);
        const lastAt = byThread.get(o.id)?.created_at ?? o.created_at;
        const lastRead = userLastReadByThread.get(o.id);
        const unread = inThread && lastAt && (!lastRead || new Date(lastRead).getTime() < new Date(lastAt).getTime());
        return {
          id: o.id,
          createdBy: o.created_by,
          createdAt: o.created_at,
          lastMessage: byThread.get(o.id)?.body ?? null,
          lastAt,
          inThread,
          unread: unread ?? false,
        };
      })
      .filter((t) => isAdminOrSupervisor || t.inThread);

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/messages/threads failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, userId, error } = await resolveThreadsAuth(req);
    if (error) return error;
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const recipientIds = Array.isArray(body?.recipientIds) ? body.recipientIds : [];
    const siteId = body?.site_id ?? null;
    const initialBody = String(body?.body ?? "").trim();

    const { data: thread, error: threadErr } = await supabaseAdmin
      .from("message_threads")
      .insert({ created_by: userId, company_id: companyId, site_id: siteId })
      .select("id")
      .single();

    if (threadErr) {
      console.error("POST message_threads failed:", threadErr);
      return NextResponse.json({ error: threadErr.message }, { status: 500 });
    }

    let allRecipients = [userId, ...recipientIds].filter((id, i, a) => a.indexOf(id) === i);

    // When operative creates thread with no other recipients, auto-add company admins/supervisors so they can respond
    const { data: creator } = await supabaseAdmin.from("users").select("role").eq("id", userId).maybeSingle();
    const creatorRole = ((creator as { role?: string })?.role ?? "").toLowerCase();
    if (creatorRole === "operative" && recipientIds.length === 0) {
      const { data: companyUsers } = await supabaseAdmin
        .from("users")
        .select("id, role")
        .eq("company_id", companyId);
      const adminRoles = ["admin", "supervisor", "sub_admin", "superuser"];
      const adminIds = (companyUsers ?? [])
        .filter((u) => adminRoles.includes(((u as { role?: string }).role ?? "").toLowerCase()))
        .map((u) => (u as { id: string }).id)
        .filter((id) => id !== userId);
      allRecipients = [...new Set([...allRecipients, ...adminIds])];
    }

    await supabaseAdmin.from("message_recipients").insert(
      allRecipients.map((uid) => ({ thread_id: thread?.id, user_id: uid }))
    );

    if (initialBody) {
      await supabaseAdmin
        .from("messages_thread")
        .insert({ thread_id: thread?.id, sender_id: userId, body: initialBody });
    }

    return NextResponse.json({ id: thread?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/messages/threads failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
