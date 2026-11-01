import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import {
  canOpenSiteChannel,
  findDirectThreadId,
  findOrCreateSiteChannel,
  siteChannelMemberIds,
  syncThreadRecipients,
} from "@/lib/messages/siteThread";

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
  if (auth instanceof NextResponse) return { companyId: "", userId: "", role: undefined, error: auth };
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

function personLabel(u: {
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!u) return "Unknown";
  const raw = [u.name, u.display_name, u.email?.split("@")[0]].find((s) => s && String(s).trim());
  return String(raw ?? "Unknown").trim() || "Unknown";
}

function inboxTitle(otherNames: string[]): string {
  const names = [...new Set(otherNames.map((n) => n.trim()).filter(Boolean))];
  if (names.length === 0) return "Conversation";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}

function previewBody(body: string | null | undefined): string | null {
  const t = (body ?? "").trim();
  if (!t || t === "Started conversation") return null;
  return t;
}

async function lastMessagesByThread(
  threadIds: string[]
): Promise<Map<string, { body: string; created_at: string; sender_id?: string }>> {
  const byThread = new Map<string, { body: string; created_at: string; sender_id?: string }>();
  if (threadIds.length === 0) return byThread;

  const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc("message_thread_last_messages", {
    p_thread_ids: threadIds,
  });
  if (!rpcErr && Array.isArray(rpcRows)) {
    for (const row of rpcRows) {
      const r = row as { thread_id: string; body: string; created_at: string; sender_id?: string };
      byThread.set(r.thread_id, {
        body: r.body,
        created_at: r.created_at,
        sender_id: r.sender_id,
      });
    }
    return byThread;
  }

  const { data: lastMsgs, error: msgsErr } = await supabaseAdmin
    .from("messages_thread")
    .select("thread_id, body, created_at, sender_id")
    .in("thread_id", threadIds);
  if (msgsErr || !lastMsgs) return byThread;
  for (const m of lastMsgs) {
    const row = m as { thread_id: string; body: string; created_at: string; sender_id?: string };
    const cur = byThread.get(row.thread_id);
    if (!cur || row.created_at > cur.created_at) {
      byThread.set(row.thread_id, {
        body: row.body,
        created_at: row.created_at,
        sender_id: row.sender_id,
      });
    }
  }
  return byThread;
}

export async function GET(req: Request) {
  try {
    const { companyId, userId, error } = await resolveThreadsAuth(req);
    if (error) return error;
    if (!companyId) return NextResponse.json([], { status: 200 });

    const url = new URL(req.url);
    const mineOnly = url.searchParams.get("mine") === "true";

    type ThreadRow = {
      id: string;
      created_by: string;
      site_id?: string | null;
      kind?: string | null;
      created_at: string;
    };

    let mineQuery = supabaseAdmin
      .from("message_recipients")
      .select("last_read_at, message_threads!inner(id, created_by, site_id, kind, created_at, archived, company_id)")
      .eq("user_id", userId)
      .eq("message_threads.company_id", companyId)
      .not("message_threads.archived", "eq", true);
    if (mineOnly) {
      mineQuery = mineQuery.eq("message_threads.created_by", userId);
    }

    const { data: myRows, error: mineErr } = await mineQuery;
    if (mineErr) {
      console.warn("GET /api/messages/threads:", mineErr.message);
      return NextResponse.json([]);
    }

    const userLastReadByThread = new Map<string, string>();
    const threadById = new Map<string, ThreadRow>();
    for (const r of myRows ?? []) {
      const row = r as unknown as { last_read_at?: string | null; message_threads: ThreadRow | ThreadRow[] | null };
      const thread = Array.isArray(row.message_threads) ? row.message_threads[0] : row.message_threads;
      if (!thread) continue;
      threadById.set(thread.id, thread);
      if (row.last_read_at) userLastReadByThread.set(thread.id, row.last_read_at);
    }

    const threads = [...threadById.values()];
    const threadIds = threads.map((t) => t.id);
    if (threadIds.length === 0) return NextResponse.json([]);

    const siteIds = [
      ...new Set(
        (threads ?? [])
          .map((t) => String((t as { site_id?: string | null }).site_id ?? "").trim())
          .filter(Boolean)
      ),
    ];

    const othersByThread = new Map<string, string[]>();
    const nameById = new Map<string, string>();
    const siteNameById = new Map<string, string>();

    const loadParticipants = async () => {
      type PersonRow = { name?: string | null; display_name?: string | null; email?: string | null };
      const { data: recipients, error: recErr } = await supabaseAdmin
        .from("message_recipients")
        .select("thread_id, user_id, users(name, display_name, email)")
        .neq("user_id", userId)
        .in("thread_id", threadIds);
      if (recErr || !Array.isArray(recipients)) return;

      for (const r of recipients) {
        const row = r as unknown as { thread_id: string; user_id: string; users: PersonRow | PersonRow[] | null };
        const person = Array.isArray(row.users) ? row.users[0] : row.users;
        nameById.set(row.user_id, personLabel(person));
        const list = othersByThread.get(row.thread_id) ?? [];
        list.push(row.user_id);
        othersByThread.set(row.thread_id, list);
      }
    };

    const loadSiteNames = async () => {
      if (siteIds.length === 0) return;
      const { data: sites } = await supabaseAdmin.from("sites").select("id, name").in("id", siteIds);
      for (const s of sites ?? []) {
        const row = s as { id: string; name?: string | null };
        const name = String(row.name ?? "").trim();
        if (name) siteNameById.set(row.id, name);
      }
    };

    const [byThread] = await Promise.all([lastMessagesByThread(threadIds), loadParticipants(), loadSiteNames()]);

    const list = (threads ?? [])
      .map((t) => {
        const o = t as {
          id: string;
          created_by: string;
          created_at: string;
          site_id?: string | null;
          kind?: string | null;
        };
        const last = byThread.get(o.id);
        const lastAt = last?.created_at ?? o.created_at;
        const lastRead = userLastReadByThread.get(o.id);
        const fromMe = last?.sender_id === userId;
        const unread = !!(
          lastAt &&
          !fromMe &&
          (!lastRead || new Date(lastRead).getTime() < new Date(lastAt).getTime())
        );
        const otherIds = othersByThread.get(o.id) ?? [];
        const otherNames = otherIds.map((id) => nameById.get(id) ?? "Unknown");
        const lastBody = previewBody(last?.body ?? null);
        const kind = o.kind === "site" ? "site" : "direct";
        const siteId = String(o.site_id ?? "").trim() || null;
        const siteName = siteId ? siteNameById.get(siteId) ?? null : null;
        return {
          id: o.id,
          createdBy: o.created_by,
          createdAt: o.created_at,
          kind,
          siteId,
          siteName,
          title: kind === "site" ? siteName || "Site chat" : inboxTitle(otherNames),
          participants: otherNames,
          lastMessage: lastBody,
          lastAt,
          inThread: true,
          unread,
        };
      })
      .sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/messages/threads failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

async function maybePostOpening(threadId: string, senderId: string, body: string) {
  if (!body) return;
  await supabaseAdmin.from("messages_thread").insert({
    thread_id: threadId,
    sender_id: senderId,
    body,
  });
}

export async function POST(req: Request) {
  try {
    const { companyId, userId, role, error } = await resolveThreadsAuth(req);
    if (error) return error;
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const rawRecipients: unknown[] = Array.isArray(body?.recipientIds) ? body.recipientIds : [];
    const recipientIds = [
      ...new Set(
        rawRecipients
          .map((id) => String(id ?? "").trim())
          .filter((id) => id.length > 0 && id !== userId)
      ),
    ];
    const siteId = String(body?.site_id ?? body?.siteId ?? "").trim() || null;
    const initialBody = String(body?.body ?? "").trim();
    const kindRaw = String(body?.kind ?? "").toLowerCase().trim();
    const kind =
      kindRaw === "site" || (kindRaw === "" && !!siteId && recipientIds.length === 0) ? "site" : "direct";

    if (kind === "site") {
      if (!siteId) {
        return NextResponse.json({ error: "Site required" }, { status: 400 });
      }
      const members = await siteChannelMemberIds(companyId, siteId);
      if (!canOpenSiteChannel(role, userId, members)) {
        return NextResponse.json({ error: "Not on this site" }, { status: 403 });
      }
      const channel = await findOrCreateSiteChannel({
        companyId,
        siteId,
        createdBy: userId,
      });
      await syncThreadRecipients(channel.id, [...members, userId]);
      await maybePostOpening(channel.id, userId, initialBody);
      return NextResponse.json({ id: channel.id, kind: "site" }, { status: 201 });
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: "Select people to message" }, { status: 400 });
    }

    const { data: people } = await supabaseAdmin
      .from("users")
      .select("id, company_id")
      .in("id", recipientIds);
    const allowed = new Set(
      (people ?? [])
        .filter((u) => String((u as { company_id?: string }).company_id ?? "") === companyId)
        .map((u) => String((u as { id: string }).id))
    );
    const validRecipients = recipientIds.filter((id) => allowed.has(id));
    if (validRecipients.length === 0) {
      return NextResponse.json({ error: "Select people to message" }, { status: 400 });
    }

    if (validRecipients.length === 1) {
      const existing = await findDirectThreadId(companyId, userId, validRecipients[0]);
      if (existing) {
        await maybePostOpening(existing, userId, initialBody);
        return NextResponse.json({ id: existing, kind: "direct" }, { status: 201 });
      }
    }

    const { data: thread, error: threadErr } = await supabaseAdmin
      .from("message_threads")
      .insert({ created_by: userId, company_id: companyId, site_id: null, kind: "direct" })
      .select("id")
      .single();

    if (threadErr || !thread) {
      console.error("POST message_threads failed:", threadErr);
      return NextResponse.json({ error: threadErr?.message ?? "Failed to create conversation" }, { status: 500 });
    }

    await supabaseAdmin.from("message_recipients").insert(
      [userId, ...validRecipients].map((uid) => ({ thread_id: (thread as { id: string }).id, user_id: uid }))
    );
    await maybePostOpening((thread as { id: string }).id, userId, initialBody);

    return NextResponse.json({ id: (thread as { id: string }).id, kind: "direct" }, { status: 201 });
  } catch (e) {
    console.error("POST /api/messages/threads failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
