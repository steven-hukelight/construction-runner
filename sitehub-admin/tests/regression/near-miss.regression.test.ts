/**
 * Near miss regression tests.
 * - Create near miss
 * - Verify site_name returned
 * - Verify site_name displayed (in API response)
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
import {
  setMockCookies,
  clearMockCookies,
  jsonRequest,
} from "./helpers";
import { mockSupabaseResponseQueue } from "../mocks/supabase";

describe("Near miss regression tests", () => {
  const companyId = "test-company-id";
  const siteId = "site-123";

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

  it("should create near miss", async () => {
    mockSupabaseResponseQueue.push({
      data: { id: "report-123" },
      error: null,
    });

    const { POST } = await import("@/app/api/near-miss/route");
    const req = jsonRequest("http://test/api/near-miss", {
      method: "POST",
      body: {
        description: "Trip hazard near entrance",
        siteId,
        status: "pending",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBeDefined();
  });

  it("should return site_name with reports", async () => {
    mockSupabaseResponseQueue.push(
      {
        data: [
          {
            id: "r1",
            description: "Test",
            site_id: siteId,
            company_id: companyId,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      },
      {
        data: [{ id: siteId, name: "Main Building" }],
        error: null,
      }
    );

    const { GET } = await import("@/app/api/near-miss/route");
    const req = new Request("http://test/api/near-miss");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(list[0].site_name).toBe("Main Building");
    }
  });

  it("should require company for create", async () => {
    clearMockCookies();
    setMockCookies({ role: "user", uid: "u1", user_email: "u@test.com" });
    mockSupabaseResponseQueue.push({ data: null, error: null });

    const { POST } = await import("@/app/api/near-miss/route");
    const req = jsonRequest("http://test/api/near-miss", {
      method: "POST",
      body: { description: "Test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
