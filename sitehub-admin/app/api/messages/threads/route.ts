import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureAccess(req?: Request): Promise<{ companyId: string; userId: string; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value?.trim();
  const userEmail = cookieStore.get("user_email")?.value?.trim();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value?.trim();

  // Mobile superuser: companyId can come from query param (ApiClient adds ?companyId=...)
  const queryCompanyId = req ? new URL(req.url).searchParams.get("companyId")?.trim() || undefined : undefined;

  if (!uid && !userEmail) {
    return { companyId: "", userId: "", error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
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
  if (!userId) return { companyId: "", userId: "", error: NextResponse.json({ error: "User not found" }, { status: 401 }) };

  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
        queryCompanyId,
      })) || "";
  }
  return { companyId, userId, error: null };
}

export async function GET(req: Request) {
  try {
    const { companyId, userId, error } = await ensureAccess(req);
    if (error) return error;
    if (!companyId) return NextResponse.json([], { status: 200 });

    const { data: threads, error: threadsErr } = await supabaseAdmin
      .from("message_threads")
      .select("id, created_by, site_id, created_at, archived")
      .eq("company_id", companyId)
      .not("archived", "eq", true)
      .order("created_at", { ascending: false });

    if (threadsErr) {
      console.warn("GET /api/messages/threads:", threadsErr.message);
      return NextResponse.json([]);
    }

    const threadIds = (threads ?? []).map((t) => (t as { id: string }).id);
    if (threadIds.length === 0) return NextResponse.json([]);

    const { data: recipients, error: recErr } = await supabaseAdmin
      .from("message_recipients")
      .select("thread_id, user_id")
      .in("thread_id", threadIds);

    const userInThread = new Set<string>();
    if (!recErr && recipients) {
      for (const r of recipients) {
        if ((r as { user_id: string }).user_id === userId) {
          userInThread.add((r as { thread_id: string }).thread_id);
        }
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

    const list = (threads ?? []).map((t) => {
      const o = t as { id: string; created_by: string; created_at: string };
      return {
        id: o.id,
        createdBy: o.created_by,
        createdAt: o.created_at,
        lastMessage: byThread.get(o.id)?.body ?? null,
        lastAt: byThread.get(o.id)?.created_at ?? o.created_at,
        inThread: userInThread.has(o.id),
      };
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/messages/threads failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, userId, error } = await ensureAccess(req);
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

    const allRecipients = [userId, ...recipientIds].filter((id, i, a) => a.indexOf(id) === i);
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
