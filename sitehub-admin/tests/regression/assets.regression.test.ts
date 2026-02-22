/**
 * Assets regression tests.
 * - Create asset
 * - Assign asset
 * - Add inspection
 * - Upload asset document
 * - Verify list refresh
 */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
import {
  setMockCookies,
  clearMockCookies,
  jsonRequest,
} from "./helpers";
import { mockSupabaseResponseQueue } from "../mocks/supabase";

describe("Assets regression tests", () => {
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

  it("should create asset", async () => {
    mockSupabaseResponseQueue.push({ data: { id: "new-asset-id" }, error: null });

    const { POST } = await import("@/app/api/assets/route");
    const req = jsonRequest("http://test/api/assets", {
      method: "POST",
      body: {
        name: "Test Asset",
        category: "Equipment",
        serial_number: "SN001",
        condition: "Good",
        company_id: companyId,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.id).toBeDefined();
  });

  it("should list assets (verify list refresh)", async () => {
    mockSupabaseResponseQueue.push({
      data: [
        { id: "a1", name: "Asset 1", company_id: companyId, site_id: null, created_at: new Date().toISOString() },
      ],
      error: null,
    });

    const { GET } = await import("@/app/api/assets/route");
    const req = new Request("http://test/api/assets");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  it("should assign asset to user", async () => {
    mockSupabaseResponseQueue.push(
      { data: { company_id: companyId }, error: null },
      { data: { id: "assignment-id" }, error: null }
    );

    const { POST } = await import("@/app/api/assets/assign/route");
    const req = jsonRequest("http://test/api/assets/assign", {
      method: "POST",
      body: { asset_id: "asset-1", user_id: "user-1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
  });

  it("should add inspection", async () => {
    mockSupabaseResponseQueue.push(
      { data: { id: userId }, error: null },
      { data: { id: "inspection-id" }, error: null }
    );

    const { POST } = await import("@/app/api/assets/inspection/route");
    const req = jsonRequest("http://test/api/assets/inspection", {
      method: "POST",
      body: { asset_id: "asset-1", notes: "All good" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should validate upload document requires file and assetId", async () => {
    const { POST } = await import("@/app/api/assets/upload-document/route");
    const form = new FormData();
    const req = new Request("http://test/api/assets/upload-document", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
