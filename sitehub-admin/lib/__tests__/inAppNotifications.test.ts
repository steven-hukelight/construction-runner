import {
  MARK_READ_MAX_IDS,
  NOTIFICATION_FEED_DEFAULT_LIMIT,
  NOTIFICATION_FEED_MAX_LIMIT,
  parseFeedQuery,
  parseMarkReadBody,
  toInAppNotification,
} from "@/lib/inAppNotifications";

const ID_A = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const ID_B = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

function url(qs: string): URL {
  return new URL(`https://www.construction-runner.com/api/me/notifications${qs}`);
}

describe("parseFeedQuery", () => {
  it("uses defaults when nothing is passed", () => {
    expect(parseFeedQuery(url(""))).toEqual({
      limit: NOTIFICATION_FEED_DEFAULT_LIMIT,
      unreadOnly: false,
      before: null,
      topic: null,
    });
  });

  it("accepts a simple topic and ignores anything else", () => {
    expect(parseFeedQuery(url("?topic=attendance_alerts")).topic).toBe("attendance_alerts");
    expect(parseFeedQuery(url("?topic=Robert'); drop")).topic).toBeNull();
  });

  it("clamps the limit", () => {
    expect(parseFeedQuery(url("?limit=0")).limit).toBe(1);
    expect(parseFeedQuery(url("?limit=5000")).limit).toBe(NOTIFICATION_FEED_MAX_LIMIT);
    expect(parseFeedQuery(url("?limit=abc")).limit).toBe(NOTIFICATION_FEED_DEFAULT_LIMIT);
  });

  it("reads the unread filter and a valid before cursor", () => {
    const q = parseFeedQuery(url("?unread=1&before=2026-10-25T10:00:00Z"));
    expect(q.unreadOnly).toBe(true);
    expect(q.before).toBe("2026-10-25T10:00:00.000Z");
    expect(parseFeedQuery(url("?before=not-a-date")).before).toBeNull();
  });
});

describe("parseMarkReadBody", () => {
  it("accepts all: true", () => {
    expect(parseMarkReadBody({ all: true })).toEqual({ all: true });
  });

  it("accepts and dedupes UUID ids", () => {
    expect(parseMarkReadBody({ ids: [ID_A, ID_A, ` ${ID_B} `] })).toEqual({ ids: [ID_A, ID_B] });
  });

  it("rejects missing, malformed or oversized id lists", () => {
    expect("error" in parseMarkReadBody({})).toBe(true);
    expect("error" in parseMarkReadBody({ ids: [] })).toBe(true);
    expect("error" in parseMarkReadBody({ ids: ["1; drop table"] })).toBe(true);
    expect("error" in parseMarkReadBody({ ids: [42] })).toBe(true);
    const tooMany = Array.from({ length: MARK_READ_MAX_IDS + 1 }, () => ID_A);
    expect("error" in parseMarkReadBody({ ids: tooMany })).toBe(true);
  });
});

describe("toInAppNotification", () => {
  it("maps database columns to the API shape", () => {
    expect(
      toInAppNotification({
        id: ID_A,
        type: "asset_inspection_reminder",
        topic: "assets",
        title: "Inspection due soon",
        body: "Scaffold tower is due for inspection on 2026-10-27.",
        data: null,
        created_at: "2026-10-25T07:00:00Z",
        read_at: null,
      }),
    ).toEqual({
      id: ID_A,
      type: "asset_inspection_reminder",
      topic: "assets",
      title: "Inspection due soon",
      body: "Scaffold tower is due for inspection on 2026-10-27.",
      data: {},
      createdAt: "2026-10-25T07:00:00Z",
      readAt: null,
    });
  });
});
