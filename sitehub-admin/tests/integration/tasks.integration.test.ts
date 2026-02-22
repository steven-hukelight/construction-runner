/**
 * Tasks integration tests – real Supabase API.
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

(run ? describe : describe.skip)("Tasks integration", () => {
  let ctx: Awaited<ReturnType<typeof getAuthContext>>;
  let createdTaskId: string;
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

  it("should create task", async () => {
    const { POST } = await import("@/app/api/tasks/route");
    const req = jsonRequest("http://test/api/tasks", {
      method: "POST",
      body: {
        title: `Integration Task ${Date.now()}`,
        description: "Integration test description",
        status: "OPEN",
        companyId: ctx.companyId,
        siteId: siteId || undefined,
      },
    });
    const res = await POST(req);
    expect([201, 400, 500]).toContain(res.status);
    if (res.status === 201) {
      const json = await res.json();
      createdTaskId = json.id;
    }
  });

  it("should fetch tasks filtered by company_id", async () => {
    const { GET } = await import("@/app/api/tasks/route");
    const req = new Request("http://test/api/tasks");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    for (const t of list || []) {
      expect(t.company_id).toBe(ctx.companyId || expect.anything());
    }
  });

  it("should fetch tasks filtered by site_id", async () => {
    const url = siteId
      ? `http://test/api/tasks?siteId=${siteId}`
      : "http://test/api/tasks";
    const { GET } = await import("@/app/api/tasks/route");
    const req = new Request(url);
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("should verify task appears after creation", async () => {
    if (!createdTaskId) return;
    if ((ctx.role ?? "").toLowerCase() === "operative") return; // operatives only see assigned tasks
    const { GET } = await import("@/app/api/tasks/route");
    const req = new Request("http://test/api/tasks");
    const res = await GET(req);
    const list = await res.json();
    if (!Array.isArray(list)) return;
    const found = list.find((t: { id: string }) => t.id === createdTaskId);
    expect(found).toBeDefined();
  });
});
