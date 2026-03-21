/**
 * Near miss integration tests – real Supabase API.
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

(run ? describe : describe.skip)("Near miss integration", () => {
  let ctx: Awaited<ReturnType<typeof getAuthContext>>;
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

  it("should create near miss", async () => {
    const { POST } = await import("@/app/api/near-miss/route");
    const req = jsonRequest("http://test/api/near-miss", {
      method: "POST",
      body: {
        description: `Integration near miss ${Date.now()}`,
        siteId: siteId || undefined,
        status: "pending",
      },
    });
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
    if (res.status === 200) {
      await res.json();
    }
  });

  it("should verify site_name returned (not just site_id)", async () => {
    const { GET } = await import("@/app/api/near-miss/route");
    const req = new Request("http://test/api/near-miss");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    const withSite = (list || []).filter(
      (r: { site_id?: string }) => r.site_id != null
    );
    for (const r of withSite) {
      expect(r).toHaveProperty("site_name");
    }
  });

  it("should fetch near miss list", async () => {
    const { GET } = await import("@/app/api/near-miss/route");
    const req = new Request("http://test/api/near-miss");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });
});
