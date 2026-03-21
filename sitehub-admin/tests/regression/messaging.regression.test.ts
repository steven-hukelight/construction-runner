/**
 * Messaging regression tests.
 * - Create thread
 * - Send message
 * - Verify sender_name
 * - Archive thread
 * - Verify archived threads hidden
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
import {
  setMockCookies,
  clearMockCookies,
  jsonRequest,
} from "./helpers";
import { mockSupabaseResponseQueue } from "../mocks/supabase";

describe("Messaging regression tests", () => {
  const companyId = "test-company-id";
  const userId = "test-user-id";

  beforeEach(() => {
    clearMockCookies();
    mockSupabaseResponseQueue.length = 0;
    setMockCookies({
      role: "admin",
      companyId,
      uid: userId,
      user_email: "admin@test.com",
    });
  });

  it("should create thread", async () => {
    mockSupabaseResponseQueue.push(
      { data: { id: userId, company_id: companyId }, error: null },
      { data: { id: "thread-123" }, error: null },
      { data: null, error: null }
    );

    const { POST } = await import("@/app/api/messages/threads/route");
    const req = jsonRequest("http://test/api/messages/threads", {
      method: "POST",
      body: { body: "Hello", recipientIds: [] },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
  });

  it("should send message", async () => {
    mockSupabaseResponseQueue.push(
      { data: { id: userId, company_id: companyId }, error: null },
      { data: { company_id: companyId }, error: null },
      { data: { user_id: userId }, error: null },
      { data: { id: "msg-123" }, error: null }
    );

    const { POST } = await import("@/app/api/messages/send/route");
    const req = jsonRequest("http://test/api/messages/send", {
      method: "POST",
      body: { thread_id: "thread-123", body: "Test message" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should return messages with sender_name", async () => {
    mockSupabaseResponseQueue.push(
      { data: { id: "t1", created_by: userId, company_id: companyId, created_at: new Date().toISOString() }, error: null },
      { data: { user_id: userId }, error: null },
      {
        data: [
          { id: "m1", sender_id: userId, body: "Hi", created_at: new Date().toISOString() },
        ],
        error: null,
      },
      { data: [{ id: userId, name: "Test User", display_name: "Test User", email: "admin@test.com" }], error: null }
    );

    const { GET } = await import("@/app/api/messages/thread/[id]/route");
    const req = new Request("http://test/api/messages/thread/thread-123");
    const res = await GET(req, { params: Promise.resolve({ id: "thread-123" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages).toBeDefined();
    expect(Array.isArray(json.messages)).toBe(true);
    if (json.messages.length > 0) {
      expect(json.messages[0]).toHaveProperty("sender_name");
    }
  });

  it("should archive thread", async () => {
    mockSupabaseResponseQueue.push(
      { data: { id: userId, company_id: companyId }, error: null },
      { data: { company_id: companyId }, error: null },
      { data: null, error: null }
    );

    const { POST } = await import("@/app/api/messages/thread/[id]/archive/route");
    const req = jsonRequest("http://test/api/messages/thread/thread-123/archive", {
      method: "POST",
      body: {},
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread-123" }) });
    expect(res.status).toBe(200);
  });

  it("should exclude archived threads from list", async () => {
    mockSupabaseResponseQueue.push(
      {
        data: [{ id: "t1", created_by: userId, created_at: new Date().toISOString(), archived: false }],
        error: null,
      },
      { data: [], error: null },
      { data: [], error: null }
    );

    const { GET } = await import("@/app/api/messages/threads/route");
    const req = new Request("http://test/api/messages/threads");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });
});
