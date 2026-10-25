/**
 * In-app notification centre for the signed-in user.
 *
 * GET   /api/me/notifications?limit=30&unread=1&before=<ISO>  -> newest first, plus unreadCount
 * PATCH /api/me/notifications  { ids: [...] } | { all: true } -> mark as read
 *
 * Auth: cookie session or Bearer token (mobile). Only ever reads or updates the caller's own rows.
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import {
  parseFeedQuery,
  parseMarkReadBody,
  toInAppNotification,
  type NotificationRow,
} from "@/lib/inAppNotifications";

export const dynamic = "force-dynamic";

const FEED_COLUMNS = "id, type, topic, title, body, data, created_at, read_at";

async function resolveMeUid(req: Request): Promise<string | null> {
  const auth = await resolvePreInductionAuth({ req });
  if (auth.uid) return auth.uid;

  if (auth.userEmail) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", auth.userEmail.trim())
      .maybeSingle();
    if (data?.id) return String(data.id);
  }
  return null;
}

async function countUnread(uid: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function GET(req: Request) {
  try {
    const uid = await resolveMeUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { limit, unreadOnly, before } = parseFeedQuery(new URL(req.url));

    let query = supabaseAdmin
      .from("notifications")
      .select(FEED_COLUMNS)
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (unreadOnly) query = query.is("read_at", null);
    if (before) query = query.lt("created_at", before);

    const [{ data, error }, unreadCount] = await Promise.all([query, countUnread(uid)]);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as NotificationRow[];
    return NextResponse.json({
      notifications: rows.map(toInAppNotification),
      unreadCount,
      nextBefore: rows.length === limit ? rows[rows.length - 1].created_at : null,
    });
  } catch (e) {
    console.error("[api/me/notifications] GET failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const uid = await resolveMeUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = parseMarkReadBody(await req.json().catch(() => ({})));
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    let update = supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", uid)
      .is("read_at", null);
    if ("ids" in parsed) update = update.in("id", parsed.ids);

    const { data, error } = await update.select("id");
    if (error) throw new Error(error.message);

    return NextResponse.json({
      updated: data?.length ?? 0,
      unreadCount: await countUnread(uid),
    });
  } catch (e) {
    console.error("[api/me/notifications] PATCH failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not update notifications" }, { status: 500 });
  }
}
