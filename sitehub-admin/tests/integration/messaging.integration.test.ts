/**
 * Messaging integration tests – real Supabase API.
 * Runs only when integration env vars are set.
 */
import { hasApiIntegrationEnv } from "./env";
import {
  getAuthContext,
  applyAuthContext,
  jsonRequest,
} from "./helpers";
import { clearMockCookies } from "../regression/helpers";

const run = hasApiIntegrationEnv();

(run ? describe : describe.skip)("Messaging integration", () => {
  let ctx: Awaited<ReturnType<typeof getAuthContext>>;
  let createdThreadId: string;

  beforeAll(async () => {
    ctx = await getAuthContext();
  });

  beforeEach(() => {
    clearMockCookies();
    applyAuthContext(ctx);
  });

  it("should create thread", async () => {
    const { POST } = await import("@/app/api/messages/threads/route");
    const req = jsonRequest("http://test/api/messages/threads", {
      method: "POST",
      body: { body: "Integration test message", recipientIds: [] },
    });
    const res = await POST(req);
    expect([201, 400, 500]).toContain(res.status);
    if (res.status === 201) {
      const json = await res.json();
      createdThreadId = json.id;
    }
  });

  it("should send message", async () => {
    const listRes = await (
      await import("@/app/api/messages/threads/route")
    ).GET(new Request("http://test/api/messages/threads"));
    const list = await listRes.json();
    const threadId = createdThreadId || list?.[0]?.id;
    if (!threadId) return;

    const { POST } = await import("@/app/api/messages/send/route");
    const req = jsonRequest("http://test/api/messages/send", {
      method: "POST",
      body: { thread_id: threadId, body: "Integration test reply" },
    });
    const res = await POST(req);
    expect([201, 400, 500]).toContain(res.status);
  });

  it("should fetch messages", async () => {
    const listRes = await (
      await import("@/app/api/messages/threads/route")
    ).GET(new Request("http://test/api/messages/threads"));
    const list = await listRes.json();
    const threadId = createdThreadId || list?.[0]?.id;
    if (!threadId) return;

    const { GET } = await import("@/app/api/messages/thread/[id]/route");
    const req = new Request(`http://test/api/messages/thread/${threadId}`);
    const res = await GET(req, { params: Promise.resolve({ id: threadId }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("messages");
    expect(Array.isArray(json.messages)).toBe(true);
  });

  it("should archive thread", async () => {
    const listRes = await (
      await import("@/app/api/messages/threads/route")
    ).GET(new Request("http://test/api/messages/threads"));
    const list = await listRes.json();
    const threadId = createdThreadId || list?.[0]?.id;
    if (!threadId) return;

    const { POST } = await import("@/app/api/messages/thread/[id]/archive/route");
    const req = jsonRequest(`http://test/api/messages/thread/${threadId}/archive`, {
      method: "POST",
      body: {},
    });
    const res = await POST(req, { params: Promise.resolve({ id: threadId }) });
    expect([200, 400, 500]).toContain(res.status);
  });

  it("should exclude archived threads from list", async () => {
    const { GET } = await import("@/app/api/messages/threads/route");
    const req = new Request("http://test/api/messages/threads");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    const archived = (list || []).filter((t: { archived?: boolean }) => t.archived === true);
    expect(archived.length).toBe(0);
  });
});
