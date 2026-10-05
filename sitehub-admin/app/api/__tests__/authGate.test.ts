/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type TableResult = { data: unknown; count?: number | null; error?: unknown };

const mockTables: Record<string, TableResult> = {};
const mockCookies: Record<string, string> = {};
const mockGetUser = jest.fn();
const mockUpdateUserById = jest.fn();
const mockValidateSession = jest.fn();

function mockBuilder(table: string) {
  const result = () => mockTables[table] ?? { data: null, error: null };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "in", "not", "order", "limit", "update", "insert", "upsert", "delete", "ilike"]) {
    builder[m] = () => builder;
  }
  builder.maybeSingle = async () => result();
  builder.single = async () => result();
  builder.then = (resolve: (v: TableResult) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(resolve, reject);
  return builder;
}

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (table: string) => mockBuilder(table),
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      admin: { updateUserById: (...args: unknown[]) => mockUpdateUserById(...args) },
    },
  },
}));

jest.mock("@/lib/sessions", () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
  updateSessionActivity: async () => {},
  SESSION_ACTIVITY_WRITE_THROTTLE_MS: 5 * 60 * 1000,
}));

jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies[name] != null ? { value: mockCookies[name] } : undefined),
    getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  }),
}));

jest.mock("@/lib/auth/siteScope", () => ({
  getRestrictedSiteIds: async () => null,
  siteIdsForFilter: () => "all",
  assertWritableSiteId: async () => null,
}));

jest.mock("@/lib/auth/companyId", () => ({
  resolveCompanyId: async () => null,
}));

import { proxy, PUBLIC_API_PATHS, CRON_API_PATHS } from "@/proxy";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { GET as nearMissGet } from "@/app/api/near-miss/route";
import { POST as finalApproveAdmin } from "@/app/api/auth/final-approve-admin/route";
import { POST as adminSetupComplete } from "@/app/api/auth/admin-setup-complete/route";
import { POST as sendWelcome } from "@/app/api/auth/sendWelcome/route";

const COMPANY = "11111111-1111-4111-8111-111111111111";
const ADMIN = { id: "22222222-2222-4222-8222-222222222222", company_id: COMPANY, role: "admin", email: "admin@example.test" };
const SUPERUSER = { id: "33333333-3333-4333-8333-333333333333", company_id: null, role: "superuser", email: "root@example.test" };
const OPERATIVE = { id: "44444444-4444-4444-8444-444444444444", company_id: COMPANY, role: "operative", email: "op@example.test" };

function resetState() {
  for (const k of Object.keys(mockTables)) delete mockTables[k];
  for (const k of Object.keys(mockCookies)) delete mockCookies[k];
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  mockValidateSession.mockReset().mockResolvedValue({ valid: false, reason: "session_not_found" });
  mockUpdateUserById.mockReset().mockResolvedValue({ data: {}, error: null });
}

/** Signs in through the web cookie path (verified `session_id` + login cookies). */
function signInWithSession(user: typeof ADMIN | typeof SUPERUSER | typeof OPERATIVE) {
  mockTables.users = { data: user };
  mockValidateSession.mockResolvedValue({ valid: true, userId: user.id, lastActiveAtMs: Date.now() });
  Object.assign(mockCookies, {
    session_id: "55555555-5555-4555-8555-555555555555",
    uid: user.id,
    role: user.role,
    user_email: user.email,
    ...(user.company_id ? { companyId: user.company_id } : {}),
  });
}

/** Signs in through the Flutter path (Bearer token, no cookies). */
function signInWithBearer(user: typeof ADMIN | typeof OPERATIVE) {
  mockTables.users = { data: user };
  mockGetUser.mockResolvedValue({ data: { user: { id: user.id, email: user.email } }, error: null });
}

function apiRoutePaths(): string[] {
  const apiDir = path.join(__dirname, "..");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "__tests__") walk(full);
      else if (entry.name === "route.ts") {
        const rel = path.relative(apiDir, path.dirname(full)).split(path.sep).join("/");
        out.push(`/api/${rel}`.replace(/\/$/, ""));
      }
    }
  };
  walk(apiDir);
  return out.sort();
}

function concretePath(route: string): string {
  return route
    .replace(/\[\.\.\.[^\]]+\]/g, "anything")
    .replace(/\[[^\]]+\]/g, "00000000-0000-4000-8000-000000000000");
}

function apiRequest(urlPath: string, init: { method?: string; headers?: Record<string, string>; cookies?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookies) {
    headers.set("cookie", Object.entries(init.cookies).map(([k, v]) => `${k}=${v}`).join("; "));
  }
  return new NextRequest(`http://localhost${urlPath}`, { method: init.method ?? "GET", headers });
}

function jsonRequest(urlPath: string, body: unknown) {
  return new Request(`http://localhost${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const passedThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

beforeEach(resetState);

describe("proxy guards every non-public API route", () => {
  const protectedRoutes = apiRoutePaths().filter((r) => !PUBLIC_API_PATHS.has(r) && !CRON_API_PATHS.has(r));

  it("finds the route files", () => {
    expect(protectedRoutes.length).toBeGreaterThan(150);
  });

  it.each(protectedRoutes)("%s returns 401 with no credentials", async (route) => {
    for (const method of ["GET", "POST"]) {
      const res = await proxy(apiRequest(concretePath(route), { method }));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    }
  });

  it.each([...CRON_API_PATHS])("%s returns 401 with no credentials and no cron secret", async (route) => {
    const res = await proxy(apiRequest(route));
    expect(res.status).toBe(401);
  });

  it("rejects forged privilege cookies without a session", async () => {
    const res = await proxy(
      apiRequest("/api/users", { cookies: { role: "superuser", uid: SUPERUSER.id, user_email: SUPERUSER.email } })
    );
    expect(res.status).toBe(401);
  });

  it("rejects a valid session whose role cookie was edited", async () => {
    signInWithSession(OPERATIVE);
    const res = await proxy(apiRequest("/api/users", { cookies: { ...mockCookies, role: "superuser" } }));
    expect(res.status).toBe(401);
  });

  it("rejects a valid session whose companyId cookie points at another company", async () => {
    signInWithSession(ADMIN);
    const res = await proxy(
      apiRequest("/api/users", { cookies: { ...mockCookies, companyId: "99999999-9999-4999-8999-999999999999" } })
    );
    expect(res.status).toBe(401);
  });

  it("lets a superuser keep an impersonated companyId", async () => {
    signInWithSession(SUPERUSER);
    const res = await proxy(apiRequest("/api/users", { cookies: { ...mockCookies, companyId: COMPANY, impersonating: "true" } }));
    expect(passedThrough(res)).toBe(true);
  });

  it("passes a verified web session through", async () => {
    signInWithSession(ADMIN);
    const res = await proxy(apiRequest("/api/near-miss", { cookies: { ...mockCookies } }));
    expect(passedThrough(res)).toBe(true);
  });

  it("passes a verified Flutter Bearer token through", async () => {
    signInWithBearer(OPERATIVE);
    const res = await proxy(apiRequest("/api/near-miss", { headers: { authorization: "Bearer valid-token" } }));
    expect(passedThrough(res)).toBe(true);
  });

  it("passes cron routes that carry CRON_SECRET", async () => {
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-cron-secret";
    try {
      const res = await proxy(
        apiRequest("/api/maintenance/dispatch-attendance-push-queue", { headers: { authorization: "Bearer test-cron-secret" } })
      );
      expect(passedThrough(res)).toBe(true);
    } finally {
      process.env.CRON_SECRET = prev;
    }
  });

  it.each([...PUBLIC_API_PATHS])("%s stays public", async (route) => {
    const res = await proxy(apiRequest(route, { method: "POST" }));
    expect(passedThrough(res)).toBe(true);
  });
});

describe("resolveMobileApiAuth fails closed", () => {
  it("returns a 401 response when no user can be established", async () => {
    const auth = await resolveMobileApiAuth(new Request("http://localhost/api/near-miss"));
    expect(auth).toBeInstanceOf(NextResponse);
    expect((auth as NextResponse).status).toBe(401);
  });

  it("returns 401 for cookies without a valid session", async () => {
    Object.assign(mockCookies, { role: "admin", uid: ADMIN.id, user_email: ADMIN.email, companyId: COMPANY });
    const auth = await resolveMobileApiAuth(new Request("http://localhost/api/near-miss"));
    expect((auth as NextResponse).status).toBe(401);
  });

  it("keeps the cookie-path shape for a verified web session", async () => {
    signInWithSession(ADMIN);
    const auth = await resolveMobileApiAuth(new Request("http://localhost/api/near-miss"));
    expect(auth).toEqual({ uid: ADMIN.id, role: "admin", companyId: COMPANY, userEmail: ADMIN.email, isSuperuser: false });
  });

  it("keeps the Bearer-path shape for the Flutter app", async () => {
    signInWithBearer(OPERATIVE);
    const auth = await resolveMobileApiAuth(
      new Request("http://localhost/api/near-miss", { headers: { authorization: "Bearer valid-token" } })
    );
    expect(auth).toEqual({ uid: OPERATIVE.id, role: "operative", companyId: COMPANY, userEmail: OPERATIVE.email, isSuperuser: false });
  });
});

describe("GET /api/near-miss", () => {
  const report = { id: "r1", site_id: "s1", attachments: ["a", "b"], reviewed_at: null, status: "open" };

  it("returns 401 with no user ID and no role", async () => {
    const res = await nearMissGet(new Request("http://localhost/api/near-miss"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for the count request with no credentials", async () => {
    const res = await nearMissGet(new Request("http://localhost/api/near-miss?count=unreviewed"));
    expect(res.status).toBe(401);
  });

  it("returns the report list with the same row shape for a signed-in admin", async () => {
    signInWithSession(ADMIN);
    mockTables.near_miss_reports = { data: [report] };
    mockTables.sites = { data: [{ id: "s1", name: "Site 1" }] };
    const res = await nearMissGet(new Request("http://localhost/api/near-miss"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ ...report, site_name: "Site 1", attachment_count: 2 }]);
  });

  it("returns { count } for a bearer-token count request from an admin", async () => {
    signInWithBearer(ADMIN);
    mockTables.near_miss_reports = { data: null, count: 3, error: null };
    const res = await nearMissGet(
      new Request("http://localhost/api/near-miss?count=unreviewed", { headers: { authorization: "Bearer valid-token" } })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 3 });
  });

  it("returns 403 for a bearer-token count request from an operative", async () => {
    signInWithBearer(OPERATIVE);
    mockTables.near_miss_reports = { data: null, count: 3, error: null };
    const res = await nearMissGet(
      new Request("http://localhost/api/near-miss?count=unreviewed", { headers: { authorization: "Bearer valid-token" } })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });
});

describe("admin-only auth routes", () => {
  const routes: Array<[string, (req: Request) => Promise<Response>, unknown]> = [
    ["/api/auth/final-approve-admin", finalApproveAdmin, { email: ADMIN.email }],
    ["/api/auth/admin-setup-complete", adminSetupComplete, { email: ADMIN.email }],
    ["/api/auth/sendWelcome", sendWelcome, { userId: ADMIN.id }],
  ];

  it.each(routes)("%s returns 401 with no credentials", async (route, handler, body) => {
    const res = await handler(jsonRequest(route, body));
    expect(res.status).toBe(401);
  });

  it.each(routes)("%s returns 403 for an operative", async (route, handler, body) => {
    signInWithSession(OPERATIVE);
    const res = await handler(jsonRequest(route, body));
    expect(res.status).toBe(403);
  });

  it("final-approve-admin returns { ok: true } for a superuser", async () => {
    signInWithSession(SUPERUSER);
    mockTables.users = { data: [ADMIN] };
    const res = await finalApproveAdmin(jsonRequest("/api/auth/final-approve-admin", { email: ADMIN.email }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("admin-setup-complete returns { ok: true } for an admin", async () => {
    signInWithSession(ADMIN);
    mockTables.users = { data: [{ id: ADMIN.id, display_name: "Admin" }] };
    const res = await adminSetupComplete(jsonRequest("/api/auth/admin-setup-complete", { email: ADMIN.email }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("sendWelcome returns { ok: true } for an admin of the same company", async () => {
    signInWithSession(ADMIN);
    mockTables.users = { data: { email: OPERATIVE.email, display_name: "Op", company_id: COMPANY } };
    const prevKey = process.env.RESEND_API_KEY;
    const prevFetch = global.fetch;
    process.env.RESEND_API_KEY = "test-resend-key";
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    try {
      const res = await sendWelcome(jsonRequest("/api/auth/sendWelcome", { userId: OPERATIVE.id }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    } finally {
      process.env.RESEND_API_KEY = prevKey;
      global.fetch = prevFetch;
    }
  });

  it("sendWelcome returns 403 for an admin of another company", async () => {
    signInWithSession(ADMIN);
    mockTables.users = { data: { email: OPERATIVE.email, display_name: "Op", company_id: "99999999-9999-4999-8999-999999999999" } };
    const res = await sendWelcome(jsonRequest("/api/auth/sendWelcome", { userId: OPERATIVE.id }));
    expect(res.status).toBe(403);
  });
});
