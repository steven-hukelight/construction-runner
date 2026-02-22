/**
 * API performance tests – response time < 500ms per endpoint.
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD, SUPABASE_SERVICE_ROLE_KEY
 * Run: npm run test:performance
 */
import { hasApiIntegrationEnv } from "../integration/env";
import { getAuthContext, applyAuthContext } from "../integration/helpers";
import { clearMockCookies } from "../regression/helpers";

const THRESHOLD_MS = 500;
const run = hasApiIntegrationEnv();

async function measureRoute(
  name: string,
  fn: () => Promise<Response>
): Promise<{ ok: boolean; ms: number }> {
  const start = performance.now();
  const res = await fn();
  const ms = performance.now() - start;
  return { ok: res.ok || res.status === 200, ms };
}

/** Warm Supabase connection with a trivial query */
async function warmConnection() {
  try {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    await supabaseAdmin.from("companies").select("id").limit(1).maybeSingle();
  } catch {
    /* ignore */
  }
}

(run ? describe : describe.skip)("API Performance", () => {
  let ctx: Awaited<ReturnType<typeof getAuthContext>>;

  beforeAll(async () => {
    ctx = await getAuthContext();
    await warmConnection();
  });

  beforeEach(() => {
    clearMockCookies();
    applyAuthContext(ctx);
  });

  it("/api/tasks responds in < 500ms", async () => {
    const { GET } = await import("@/app/api/tasks/route");
    const req = new Request("http://test/api/tasks");
    const { ok, ms } = await measureRoute("/api/tasks", () => GET(req));
    expect(ok).toBe(true);
    expect(ms).toBeLessThan(THRESHOLD_MS);
  }, 10000);

  it("/api/assets responds in < 500ms", async () => {
    const { GET } = await import("@/app/api/assets/route");
    const req = new Request("http://test/api/assets");
    const { ok, ms } = await measureRoute("/api/assets", () => GET(req));
    expect(ok).toBe(true);
    expect(ms).toBeLessThan(THRESHOLD_MS);
  }, 10000);

  it("/api/deliveries responds in < 500ms", async () => {
    const { GET } = await import("@/app/api/deliveries/route");
    const req = new Request("http://test/api/deliveries");
    const { ok, ms } = await measureRoute("/api/deliveries", () => GET(req));
    expect(ok).toBe(true);
    expect(ms).toBeLessThan(THRESHOLD_MS);
  }, 10000);

  it("/api/messages/threads responds in < 500ms", async () => {
    const { GET } = await import("@/app/api/messages/threads/route");
    const req = new Request(`http://test/api/messages/threads?companyId=${ctx.companyId || ""}`);
    const { ok, ms } = await measureRoute("/api/messages/threads", () => GET(req));
    expect(ok).toBe(true);
    expect(ms).toBeLessThan(THRESHOLD_MS);
  }, 10000);

  it("/api/messages/thread/[id] responds in < 500ms", async () => {
    const { GET: getThreads } = await import("@/app/api/messages/threads/route");
    const listRes = await getThreads(
      new Request(`http://test/api/messages/threads?companyId=${ctx.companyId || ""}`)
    );
    const list = await listRes.json();
    const tid = Array.isArray(list) && list[0]?.id ? list[0].id : null;
    if (!tid) return;
    const { GET: getThread } = await import("@/app/api/messages/thread/[id]/route");
    const req = new Request(`http://test/api/messages/thread/${tid}`);
    const { ok, ms } = await measureRoute(`/api/messages/thread/[id]`, () =>
      getThread(req, { params: Promise.resolve({ id: tid }) })
    );
    expect(ok).toBe(true);
    expect(ms).toBeLessThan(THRESHOLD_MS);
  }, 10000);

  it("/api/near-miss responds in < 500ms", async () => {
    const { GET } = await import("@/app/api/near-miss/route");
    const req = new Request("http://test/api/near-miss");
    const { ok, ms } = await measureRoute("/api/near-miss", () => GET(req));
    expect(ok).toBe(true);
    expect(ms).toBeLessThan(THRESHOLD_MS);
  }, 10000);
});
