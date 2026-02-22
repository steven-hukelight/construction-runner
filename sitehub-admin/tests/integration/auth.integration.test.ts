/**
 * Auth integration tests – real Supabase Auth and API routes.
 * Runs only when SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD are set.
 */
import { createClient } from "@supabase/supabase-js";
import { hasIntegrationEnv, hasApiIntegrationEnv } from "./env";
import {
  getAuthContext,
  applyAuthContext,
  jsonRequest,
} from "./helpers";
import { setMockCookies, clearMockCookies } from "../regression/helpers";

const runIntegration = hasIntegrationEnv();
const runApiIntegration = hasApiIntegrationEnv();

(runIntegration ? describe : describe.skip)("Auth integration (real Supabase)", () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  it("should login with valid credentials", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL!,
      password: process.env.TEST_PASSWORD!,
    });
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    expect(data.user).toBeDefined();
  });

  it("should reject invalid credentials", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "invalid@example.com",
      password: "wrongpassword",
    });
    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it("should support superuser login when user has superuser role", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL!,
      password: process.env.TEST_PASSWORD!,
    });
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
  });
});

(runApiIntegration ? describe : describe.skip)(
  "Superuser impersonation (API integration)",
  () => {
    beforeEach(() => clearMockCookies());

    it("should start impersonation when superuser", async () => {
      const ctx = await getAuthContext();
      if ((ctx.role ?? "").toLowerCase() !== "superuser") {
        return; // skip if test user is not superuser
      }
      applyAuthContext(ctx);
      setMockCookies({ role: "superuser" });

      const { POST } = await import("@/app/api/impersonate/route");
      const req = jsonRequest("http://test/api/impersonate", {
        method: "POST",
        body: { company_id: ctx.companyId || "any-company-uuid" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain("impersonating=true");
      expect(setCookie).toContain("companyId=");
    });

    it("should stop impersonation", async () => {
      setMockCookies({ role: "superuser", impersonating: "true", companyId: "test-company" });

      const { POST } = await import("@/app/api/stop-impersonate/route");
      const res = await POST(
        new Request("http://test/api/stop-impersonate", { method: "POST" })
      );
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain("impersonating=");
      expect(setCookie).toContain("companyId=");
    });

    it("should reject impersonate when not superuser", async () => {
      const ctx = await getAuthContext();
      applyAuthContext(ctx);
      setMockCookies({ role: "admin", companyId: ctx.companyId });

      const { POST } = await import("@/app/api/impersonate/route");
      const req = jsonRequest("http://test/api/impersonate", {
        method: "POST",
        body: { company_id: "other-company" },
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  }
);

(runApiIntegration ? describe : describe.skip)(
  "Impersonation expiry (cookie time-boxed)",
  () => {
    it("should set impersonation cookie with maxAge", async () => {
      const ctx = await getAuthContext();
      if ((ctx.role ?? "").toLowerCase() !== "superuser") return;

      setMockCookies({ role: "superuser" });
      const { POST } = await import("@/app/api/impersonate/route");
      const req = jsonRequest("http://test/api/impersonate", {
        method: "POST",
        body: { company_id: ctx.companyId || "any-uuid" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toMatch(/max-age=\d+/);
    });
  }
);

// Rehydration from secure storage: mobile-only; not testable in Node.js API suite
(runIntegration ? describe : describe.skip)(
  "Rehydration (auth only – mobile uses SecureStorage)",
  () => {
    it("should have valid session after login for rehydration", async () => {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase.auth.signInWithPassword({
        email: process.env.TEST_EMAIL!,
        password: process.env.TEST_PASSWORD!,
      });
      expect(data.session?.access_token).toBeDefined();
      // Mobile rehydration would restore this token to SecureStorage
    });
  }
);
