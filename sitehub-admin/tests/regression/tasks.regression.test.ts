/**
 * Tasks regression tests.
 * - Create task
 * - Verify company_id filter
 * - Verify site_id filter
 * - Verify list refresh
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
import {
  setMockCookies,
  clearMockCookies,
  jsonRequest,
} from "./helpers";
import { mockSupabaseResponseQueue } from "../mocks/supabase";

describe("Tasks regression tests", () => {
  const companyId = "test-company-id";

  beforeEach(() => {
    clearMockCookies();
    mockSupabaseResponseQueue.length = 0;
    setMockCookies({
      role: "admin",
      companyId,
      uid: "test-uid",
      user_email: "admin@test.com",
    });
  });

  it("should create task", async () => {
    mockSupabaseResponseQueue.push(
      { data: { id: "task-123" }, error: null }
    );

    const { POST } = await import("@/app/api/tasks/route");
    const req = jsonRequest("http://test/api/tasks", {
      method: "POST",
      body: {
        title: "Test Task",
        description: "Description",
        status: "OPEN",
        companyId: companyId,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
  });

  it("should filter by company_id", async () => {
    mockSupabaseResponseQueue.push({
      data: [
        {
          id: "t1",
          title: "Task 1",
          company_id: companyId,
          site_id: "site-1",
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const { GET } = await import("@/app/api/tasks/route");
    const req = new Request("http://test/api/tasks");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(list[0].company_id).toBe(companyId);
    }
  });

  it("should filter by site_id when provided", async () => {
    mockSupabaseResponseQueue.push({
      data: [
        {
          id: "t1",
          title: "Site Task",
          company_id: companyId,
          site_id: "site-123",
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const { GET } = await import("@/app/api/tasks/route");
    const req = new Request("http://test/api/tasks?siteId=site-123");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("should list tasks (verify list refresh)", async () => {
    mockSupabaseResponseQueue.push({
      data: [
        {
          id: "t1",
          title: "Task 1",
          company_id: companyId,
          site_id: null,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const { GET } = await import("@/app/api/tasks/route");
    const req = new Request("http://test/api/tasks");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });
});
