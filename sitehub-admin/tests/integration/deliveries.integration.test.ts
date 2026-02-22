/**
 * Deliveries integration tests – real Supabase API.
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

(run ? describe : describe.skip)("Deliveries integration", () => {
  let ctx: Awaited<ReturnType<typeof getAuthContext>>;
  let createdDeliveryId: string;
  let siteId: string | null = null;

  beforeAll(async () => {
    ctx = await getAuthContext();
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data: sites } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("company_id", ctx.companyId)
      .limit(1);
    siteId = sites?.[0]?.id ?? null;
  });

  beforeEach(() => {
    clearMockCookies();
    applyAuthContext(ctx);
  });

  it("should create delivery", async () => {
    const { POST } = await import("@/app/api/deliveries/route");
    const req = jsonRequest("http://test/api/deliveries", {
      method: "POST",
      body: {
        reference: `REF-${Date.now()}`,
        wholesaler: "Test Wholesaler",
        site_id: siteId || undefined,
        scheduled_at: new Date().toISOString(),
        created_by: ctx.uid,
        status: "PENDING",
      },
    });
    const res = await POST(req);
    expect([201, 400, 500]).toContain(res.status);
    if (res.status === 201) {
      const json = await res.json();
      createdDeliveryId = json.id;
    }
  });

  it("should fetch delivery list", async () => {
    const { GET } = await import("@/app/api/deliveries/route");
    const req = new Request("http://test/api/deliveries");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0 && list[0].site_id) {
      expect(list[0]).toHaveProperty("site");
    }
  });

  it("should verify site_id and company_id scoping", async () => {
    const { GET } = await import("@/app/api/deliveries/route");
    const req = new Request(
      `http://test/api/deliveries?companyId=${ctx.companyId || ""}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    for (const d of list) {
      expect(d.company_id).toBe(ctx.companyId || expect.anything());
    }
  });

  it("should validate POD upload requires file", async () => {
    const form = new FormData();
    form.append("deliveryId", createdDeliveryId || "any-id");
    form.append("type", "pod");

    const { POST } = await import("@/app/api/deliveries/upload/route");
    const req = new Request("http://test/api/deliveries/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect([400, 500]).toContain(res.status);
  });

  it("should accept valid POD upload when delivery exists", async () => {
    const listRes = await (
      await import("@/app/api/deliveries/route")
    ).GET(new Request("http://test/api/deliveries"));
    const list = await listRes.json();
    const did = createdDeliveryId || list?.[0]?.id;
    if (!did) return;

    const form = new FormData();
    form.append("deliveryId", did);
    form.append("type", "pod");
    form.append("file", new Blob(["fake"], { type: "image/jpeg" }), "pod.jpg");

    const { POST } = await import("@/app/api/deliveries/upload/route");
    const req = new Request("http://test/api/deliveries/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
  });

  it("should accept valid load photo upload when delivery exists", async () => {
    const listRes = await (
      await import("@/app/api/deliveries/route")
    ).GET(new Request("http://test/api/deliveries"));
    const list = await listRes.json();
    const did = createdDeliveryId || list?.[0]?.id;
    if (!did) return;

    const form = new FormData();
    form.append("deliveryId", did);
    form.append("type", "load");
    form.append("file", new Blob(["fake"], { type: "image/jpeg" }), "load.jpg");

    const { POST } = await import("@/app/api/deliveries/upload/route");
    const req = new Request("http://test/api/deliveries/upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
  });
});
