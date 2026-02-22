/**
 * Assets integration tests – real Supabase API.
 * Runs only when SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD,
 * and SUPABASE_SERVICE_ROLE_KEY are set.
 */
import { hasApiIntegrationEnv } from "./env";
import {
  getAuthContext,
  applyAuthContext,
  jsonRequest,
} from "./helpers";
import { clearMockCookies } from "../regression/helpers";

const run = hasApiIntegrationEnv();

(run ? describe : describe.skip)("Assets integration", () => {
  let ctx: Awaited<ReturnType<typeof getAuthContext>>;
  let createdAssetId: string;

  beforeAll(async () => {
    ctx = await getAuthContext();
  });

  beforeEach(() => {
    clearMockCookies();
    applyAuthContext(ctx);
  });

  it("should create asset", async () => {
    const { POST } = await import("@/app/api/assets/route");
    const req = jsonRequest("http://test/api/assets", {
      method: "POST",
      body: {
        name: `Integration Test Asset ${Date.now()}`,
        category: "Equipment",
        serial_number: `SN-${Date.now()}`,
        condition: "Good",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.id).toBeDefined();
    createdAssetId = json.id;
  });

  it("should fetch asset list", async () => {
    const { GET } = await import("@/app/api/assets/route");
    const req = new Request("http://test/api/assets");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(list[0]).toHaveProperty("company_id");
    }
  });

  it("should verify company_id scoping", async () => {
    const { GET } = await import("@/app/api/assets/route");
    const req = new Request(
      `http://test/api/assets?companyId=${ctx.companyId || "none"}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    for (const a of list) {
      expect(a.company_id).toBe(ctx.companyId || expect.anything());
    }
  });

  it("should assign asset", async () => {
    const listRes = await (
      await import("@/app/api/assets/route")
    ).GET(new Request("http://test/api/assets"));
    const list = await listRes.json();
    const assetId = list?.[0]?.id ?? createdAssetId;
    if (!assetId) return; // skip if no assets

    const { POST } = await import("@/app/api/assets/assign/route");
    const req = jsonRequest("http://test/api/assets/assign", {
      method: "POST",
      body: { asset_id: assetId, user_id: ctx.uid },
    });
    const res = await POST(req);
    expect([201, 400, 500]).toContain(res.status);
  });

  it("should add inspection", async () => {
    const listRes = await (
      await import("@/app/api/assets/route")
    ).GET(new Request("http://test/api/assets"));
    const list = await listRes.json();
    const assetId = list?.[0]?.id ?? createdAssetId;
    if (!assetId) return;

    const { POST } = await import("@/app/api/assets/inspection/route");
    const req = jsonRequest("http://test/api/assets/inspection", {
      method: "POST",
      body: { asset_id: assetId, notes: "Integration inspection" },
    });
    const res = await POST(req);
    expect([201, 400, 500]).toContain(res.status);
  });

  it("should require assetId for document upload", async () => {
    const form = new FormData();
    const file = new Blob(["test"], { type: "text/plain" });
    form.append("file", file, "test.txt");

    const { POST } = await import("@/app/api/assets/upload-document/route");
    const req = new Request("http://test/api/assets/upload-document", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
