/** Request parsing and row mapping for GET/PATCH /api/me/notifications. */

export const NOTIFICATION_FEED_DEFAULT_LIMIT = 30;
export const NOTIFICATION_FEED_MAX_LIMIT = 100;
export const MARK_READ_MAX_IDS = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NotificationRow = {
  id: string;
  type: string;
  topic: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

export type InAppNotification = {
  id: string;
  type: string;
  topic: string | null;
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export type FeedQuery = {
  limit: number;
  unreadOnly: boolean;
  before: string | null;
};

export function parseFeedQuery(url: URL): FeedQuery {
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), NOTIFICATION_FEED_MAX_LIMIT)
    : NOTIFICATION_FEED_DEFAULT_LIMIT;

  const unread = (url.searchParams.get("unread") ?? "").toLowerCase();
  const unreadOnly = unread === "1" || unread === "true";

  const beforeRaw = url.searchParams.get("before");
  const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw).toISOString() : null;

  return { limit, unreadOnly, before };
}

export type MarkReadRequest = { all: true } | { ids: string[] };

export function parseMarkReadBody(body: unknown): MarkReadRequest | { error: string } {
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (o.all === true) return { all: true };

  if (!Array.isArray(o.ids) || o.ids.length === 0) {
    return { error: "Provide ids (array of notification ids) or all: true" };
  }
  if (o.ids.length > MARK_READ_MAX_IDS) {
    return { error: `At most ${MARK_READ_MAX_IDS} ids per request` };
  }
  const ids = [...new Set(o.ids.map((v) => (typeof v === "string" ? v.trim() : "")))];
  if (ids.some((id) => !UUID_RE.test(id))) {
    return { error: "ids must be notification UUIDs" };
  }
  return { ids };
}

export function toInAppNotification(row: NotificationRow): InAppNotification {
  return {
    id: row.id,
    type: row.type,
    topic: row.topic,
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}
