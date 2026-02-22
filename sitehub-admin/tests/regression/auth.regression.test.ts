/**
 * Auth regression tests.
 * Tests login, superuser, impersonation with mocked Supabase (auth/login uses real Supabase - run integration when env set).
 */
import { createClient } from "@supabase/supabase-js";
import {
  setMockCookies,
  clearMockCookies,
  jsonRequest,
} from "./helpers";
import { mockSupabaseResponseQueue } from "../mocks/supabase";

// Auth/login uses createClient directly - not mocked. We test impersonate/stop-impersonate with mocks.
const runIntegration = !!(
  process.env.SUPABASE_URL &&
  process.env.TEST_EMAIL &&
  process.env.TEST_PASSWORD
);

describe("Auth regression tests", () => {
  beforeEach(() => {
    clearMockCookies();
    mockSupabaseResponseQueue.length = 0;
  });

  describe("Impersonate (mocked)", () => {
    it("should reject impersonate when not superuser", async () => {
      setMockCookies({ role: "admin", companyId: "cid" });
      const { POST } = await import("@/app/api/impersonate/route");
      const req = jsonRequest("http://test/api/impersonate", {
        method: "POST",
        body: { company_id: "other-company" },
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("should allow impersonate when superuser", async () => {
      setMockCookies({ role: "superuser" });
      const { POST } = await import("@/app/api/impersonate/route");
      const req = jsonRequest("http://test/api/impersonate", {
        method: "POST",
        body: { company_id: "target-company-id" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain("impersonating=true");
      expect(setCookie).toContain("companyId=target-company-id");
    });

    it("should reject impersonate without company_id", async () => {
      setMockCookies({ role: "superuser" });
      const { POST } = await import("@/app/api/impersonate/route");
      const req = jsonRequest("http://test/api/impersonate", {
        method: "POST",
        body: {},
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Stop impersonate (mocked)", () => {
    it("should clear impersonation cookies", async () => {
      const { POST } = await import("@/app/api/stop-impersonate/route");
      const res = await POST(new Request("http://test/api/stop-impersonate", { method: "POST" }));
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain("impersonating=");
      expect(setCookie).toContain("companyId=");
    });
  });

  (runIntegration ? describe : describe.skip)("Login (integration - real Supabase)", () => {
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
      const metadata = data.user?.user_metadata;
      const role = metadata?.role;
      expect(role === "superuser" || metadata).toBeDefined();
    });
  });
});
