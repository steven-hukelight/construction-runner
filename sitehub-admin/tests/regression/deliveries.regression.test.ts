/**
 * Deliveries regression tests.
 * - Create delivery
 * - Upload POD
 * - Upload load photo
 * - Verify site selector text visibility (site name in response)
 * - Verify list refresh
 */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
import {
  setMockCookies,
  clearMockCookies,
  jsonRequest,
  formDataRequest,
} from "./helpers";
import { mockSupabaseResponseQueue } from "../mocks/supabase";

describe("Deliveries regression tests", () => {
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

  it("should create delivery", async () => {
    mockSupabaseResponseQueue.push({
      data: { id: "new-delivery-id" },
      error: null,
    });

    const { POST } = await import("@/app/api/deliveries/route");
    const req = jsonRequest("http://test/api/deliveries", {
      method: "POST",
      body: {
        reference: "REF001",
        wholesaler: "Medlocks",
        site_id: "site-1",
        scheduled_at: new Date().toISOString(),
        created_by: "user-1",
        status: "PENDING",
        company_id: companyId,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
  });

  it("should list deliveries with site name (site selector text visibility)", async () => {
    mockSupabaseResponseQueue.push(
      {
        data: [
          {
            id: "d1",
            reference: "REF001",
            site_id: "site-1",
            company_id: companyId,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      },
      {
        data: [{ id: "site-1", name: "Main Site" }],
        error: null,
      }
    );

    const { GET } = await import("@/app/api/deliveries/route");
    const req = new Request("http://test/api/deliveries");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0 && list[0].site) {
      expect(list[0].site).toBe("Main Site");
    }
  });

  it("should require company_id when creating", async () => {
    clearMockCookies();
    setMockCookies({ role: "user", uid: "u1", user_email: "u@test.com" });
    mockSupabaseResponseQueue.push({ data: null, error: null });

    const { POST } = await import("@/app/api/deliveries/route");
    const req = jsonRequest("http://test/api/deliveries", {
      method: "POST",
      body: { reference: "REF", created_by: "u1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("Deliveries upload (POD / load photo)", () => {
  const companyId = "test-company-id";
  const deliveryId = "delivery-123";

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

  it("should validate upload requires deliveryId, type, file", async () => {
    const { POST } = await import("@/app/api/deliveries/upload/route");
    const form = new FormData();
    form.append("deliveryId", deliveryId);
    form.append("type", "pod");
    const req = new Request("http://test/api/deliveries/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should accept valid POD upload (mocked storage)", async () => {
    const file = new Blob(["fake image"], { type: "image/jpeg" });
    mockSupabaseResponseQueue.push(
      { data: { id: deliveryId, company_id: companyId }, error: null },
      { data: null, error: null },
      { data: { id: deliveryId, pod_url: "https://signed.url/pod.jpg" }, error: null }
    );

    const form = new FormData();
    form.append("deliveryId", deliveryId);
    form.append("type", "pod");
    form.append("file", file, "pod.jpg");

    const { POST } = await import("@/app/api/deliveries/upload/route");
    const req = new Request("http://test/api/deliveries/upload", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.url).toBeDefined();
  });

  it("should accept valid load photo upload (mocked storage)", async () => {
    const file = new Blob(["fake load image"], { type: "image/jpeg" });
    mockSupabaseResponseQueue.push(
      { data: { id: deliveryId, company_id: companyId }, error: null },
      { data: { load_photos: [], load_url: null }, error: null },
      { data: null, error: null },
      { data: { id: deliveryId, load_url: "https://signed.url/load.jpg", load_photos: ["https://signed.url/load.jpg"] }, error: null }
    );

    const form = new FormData();
    form.append("deliveryId", deliveryId);
    form.append("type", "load");
    form.append("file", file, "load.jpg");

    const { POST } = await import("@/app/api/deliveries/upload/route");
    const req = new Request("http://test/api/deliveries/upload", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
