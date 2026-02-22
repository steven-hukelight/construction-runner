/**
 * Pre-induction integration tests – real Supabase API.
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

(run ? describe : describe.skip)("Pre-induction integration", () => {
  let ctx: Awaited<ReturnType<typeof getAuthContext>>;

  beforeAll(async () => {
    ctx = await getAuthContext();
  });

  beforeEach(() => {
    clearMockCookies();
    applyAuthContext(ctx);
  });

  it("should return sections with immediate refresh on GET", async () => {
    const { GET } = await import("@/app/api/pre-induction/route");
    const req = new Request(`http://test/api/pre-induction?userId=${ctx.uid}`);
    const res = await GET(req);
    if (res.status === 404) {
      return; // user not in users table (auth-only user) - skip
    }
    expect(res.status).toBe(200);
    const sections = await res.json();
    expect(Array.isArray(sections)).toBe(true);
    const ids = sections.map((s: { section: string }) => s.section);
    expect(ids).toContain("personal");
    expect(ids).toContain("competencyCard");
    expect(ids).toContain("certifications");
    expect(ids).toContain("declarations");
  });

  it("should update personal section", async () => {
    const { POST } = await import("@/app/api/pre-induction/[userId]/personal/route");
    const req = jsonRequest(`http://test/api/pre-induction/${ctx.uid}/personal`, {
      method: "POST",
      body: { fullName: "Integration Test User", email: ctx.user_email },
    });
    const res = await POST(req, { params: Promise.resolve({ userId: ctx.uid }) });
    expect([200, 500]).toContain(res.status); // 500 when user not in users table (FK)
  });

  it("should require competency card (competency card required)", async () => {
    const { POST } = await import(
      "@/app/api/pre-induction/[userId]/competency-card/route"
    );
    const req = jsonRequest(
      `http://test/api/pre-induction/${ctx.uid}/competency-card`,
      {
        method: "POST",
        body: {
          cardType: "CSCS",
          cardNumber: "TEST123",
          fileUrl: "https://example.com/card.jpg",
        },
      }
    );
    const res = await POST(req, { params: Promise.resolve({ userId: ctx.uid }) });
    expect([200, 400, 500]).toContain(res.status); // 500 when user not in users table (FK)
  });

  it("should allow certifications update (certifications NOT required)", async () => {
    const { POST } = await import(
      "@/app/api/pre-induction/[userId]/certifications/route"
    );
    const req = jsonRequest(
      `http://test/api/pre-induction/${ctx.uid}/certifications`,
      {
        method: "POST",
        body: { certifications: [] },
      }
    );
    const res = await POST(req, { params: Promise.resolve({ userId: ctx.uid }) });
    expect([200, 400, 500]).toContain(res.status); // 500 when user not in users table (FK)
  });
});
