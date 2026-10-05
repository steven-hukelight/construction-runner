/**
 * @jest-environment node
 */
type TableResult = { data: unknown; error?: unknown };
type UserRow = { id: string; company_id: string | null; role: string; email: string };
type Invite = { id: string; type: string; site_id: string; main_contractor_id: string; use_count: number; max_uses: number; expired?: boolean };
type Write = { table: string; op: string; payload?: unknown };

const mockUsers: Record<string, UserRow> = {};
const mockInvites: Record<string, Invite> = {};
const mockSites: Record<string, { company_id: string }> = {};
const mockWrites: Write[] = [];
const mockRpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
const mockGetUser = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUserById = jest.fn();
const mockDeleteUser = jest.fn();

function mockBuilder(table: string) {
  const filters: Record<string, unknown> = {};
  let op = "select";
  const result = (): TableResult => {
    if (op !== "select") {
      if (table === "companies" && op === "insert") return { data: { id: "new-company-id" }, error: null };
      return { data: null, error: null };
    }
    if (table === "users") {
      if (typeof filters.email === "string") {
        const needle = (filters.email as string).replace(/\\([\\%_])/g, "$1").toLowerCase();
        return { data: Object.values(mockUsers).filter((u) => u.email.toLowerCase() === needle).map((u) => ({ id: u.id })), error: null };
      }
      const id = filters.id as string | undefined;
      return { data: (id && mockUsers[id]) || null, error: null };
    }
    if (table === "invite_codes") {
      const inv = mockInvites[filters.id as string];
      return { data: inv ? { id: inv.id, type: inv.type } : null, error: null };
    }
    if (table === "sites") return { data: mockSites[filters.id as string] ?? null, error: null };
    return { data: null, error: null };
  };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "is", "in", "not", "order", "limit"]) builder[m] = () => builder;
  for (const m of ["insert", "upsert", "update", "delete"]) {
    builder[m] = (payload?: unknown) => {
      op = m;
      mockWrites.push({ table, op: m, payload });
      return builder;
    };
  }
  builder.select = () => builder;
  builder.eq = (column: string, value: unknown) => {
    filters[column] = value;
    return builder;
  };
  builder.ilike = (column: string, value: unknown) => {
    filters[column] = value;
    return builder;
  };
  builder.maybeSingle = async () => result();
  builder.single = async () => result();
  builder.then = (resolve: (v: TableResult) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(resolve, reject);
  return builder;
}

async function mockRpc(fn: string, args: Record<string, unknown>) {
  mockRpcCalls.push({ fn, args });
  const inv = mockInvites[args.p_code as string];
  if (fn === "claim_invite_code") {
    if (!inv || inv.type !== args.p_type || inv.expired || inv.use_count >= inv.max_uses) return { data: [], error: null };
    inv.use_count += 1;
    return { data: [{ claimed_site_id: inv.site_id, claimed_main_contractor_id: inv.main_contractor_id }], error: null };
  }
  if (fn === "release_invite_code" && inv) inv.use_count = Math.max(inv.use_count - 1, 0);
  return { data: null, error: null };
}

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (table: string) => mockBuilder(table),
    rpc: (fn: string, args: Record<string, unknown>) => mockRpc(fn, args),
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      admin: {
        createUser: (...args: unknown[]) => mockCreateUser(...args),
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
      },
    },
  },
}));

jest.mock("@/lib/sessions", () => ({
  validateSession: async () => ({ valid: false, reason: "session_not_found" }),
  updateSessionActivity: async () => {},
  SESSION_ACTIVITY_WRITE_THROTTLE_MS: 5 * 60 * 1000,
}));
jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, getAll: () => [] }) }));
jest.mock("@/lib/auth/companyId", () => ({ resolveCompanyId: async () => null }));
jest.mock("@/lib/sendPasswordReset", () => ({
  generateRecoveryLink: async () => "https://example.test/setup",
  deliverPasswordResetEmail: async () => true,
  setupPasswordPageUrl: (origin: string) => `${origin}/setup-password`,
}));
jest.mock("@/lib/url", () => ({ getServerPublicOrigin: () => "https://example.test" }));

import { POST as redeemPost } from "@/app/api/invite-codes/redeem/route";
import { POST as createCodePost } from "@/app/api/invite-codes/route";
import { generateInviteCode, INVITE_CODE_LENGTH, REDEEM_FAILURE_MIN_MS, REDEEM_RATE_LIMITS } from "@/lib/inviteCodes";

const COMPANY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SITE_A = "site-a";
const user = (id: string, company_id: string | null, role: string, email?: string): UserRow => ({
  id,
  company_id,
  role,
  email: email ?? `${role}-${id.slice(-4)}@example.test`,
});

const OPERATIVE = user("30000000-0000-4000-8000-000000000001", COMPANY_A, "operative");
const ADMIN_SAME = user("30000000-0000-4000-8000-000000000003", COMPANY_A, "admin", "Boss.Person@example.test");
const ADMIN_OTHER = user("30000000-0000-4000-8000-000000000004", COMPANY_B, "admin");
const SUPERVISOR_SAME = user("30000000-0000-4000-8000-000000000005", COMPANY_A, "supervisor");
const SITE_ADMIN_SAME = user("30000000-0000-4000-8000-000000000006", COMPANY_A, "site_admin");
const SUB_ADMIN_SAME = user("30000000-0000-4000-8000-000000000007", COMPANY_A, "sub_admin");
const SUPERUSER = user("30000000-0000-4000-8000-000000000008", null, "superuser", "root_user@example.test");
const ALL_USERS = [OPERATIVE, ADMIN_SAME, ADMIN_OTHER, SUPERVISOR_SAME, SITE_ADMIN_SAME, SUB_ADMIN_SAME, SUPERUSER];

let ipCounter = 0;
let codeCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter}`;
function addInvite(overrides: Partial<Invite> = {}): string {
  const id = `CODE${String(++codeCounter).padStart(6, "0")}`;
  mockInvites[id] = { id, type: "subcontractor", site_id: SITE_A, main_contractor_id: COMPANY_A, use_count: 0, max_uses: 1, ...overrides };
  return id;
}

function redeem(body: Record<string, unknown>, ip = nextIp()) {
  return redeemPost(
    new Request("http://localhost/api/invite-codes/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  );
}

async function timed(fn: () => Promise<Response>) {
  const started = Date.now();
  const res = await fn();
  return { res, ms: Date.now() - started, body: await res.json() };
}

const usersWrites = () => mockWrites.filter((w) => w.table === "users");

beforeEach(() => {
  for (const store of [mockUsers, mockInvites, mockSites] as Record<string, unknown>[]) {
    for (const k of Object.keys(store)) delete store[k];
  }
  for (const u of ALL_USERS) mockUsers[u.id] = u;
  mockSites[SITE_A] = { company_id: COMPANY_A };
  mockWrites.length = 0;
  mockRpcCalls.length = 0;
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  mockCreateUser.mockReset().mockResolvedValue({ data: { user: { id: "40000000-0000-4000-8000-000000000001" } }, error: null });
  mockUpdateUserById.mockReset().mockResolvedValue({ data: {}, error: null });
  mockDeleteUser.mockReset().mockResolvedValue({ data: {}, error: null });
});

describe("POST /api/invite-codes/redeem", () => {
  jest.setTimeout(20000);

  it("creates a new account with the existing response shape", async () => {
    const code = addInvite();
    const res = await redeem({ code, email: "new.person@example.test", name: "New" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      company_id: "new-company-id",
      companyId: "new-company-id",
      site_id: SITE_A,
      siteId: SITE_A,
      userId: "40000000-0000-4000-8000-000000000001",
      existingUser: false,
      setupEmailSent: true,
      redirect: "/setup-password",
    });
    expect(usersWrites()).toEqual([
      { table: "users", op: "insert", payload: expect.objectContaining({ role: "sub_admin", company_id: "new-company-id" }) },
    ]);
  });

  it.each([
    ["exact case", ADMIN_SAME.email],
    ["different case", ADMIN_SAME.email.toUpperCase()],
    ["superuser with an underscore", SUPERUSER.email],
  ])("never modifies an existing user (%s)", async (_label, email) => {
    const code = addInvite();
    const before = JSON.stringify(mockUsers);
    const res = await redeem({ code, email });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid invite code" });
    expect(usersWrites()).toEqual([]);
    expect(mockWrites).toEqual([]);
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUserById).not.toHaveBeenCalled();
    expect(mockRpcCalls).toEqual([]);
    expect(mockInvites[code].use_count).toBe(0);
    expect(JSON.stringify(mockUsers)).toBe(before);
  });

  it("an existing email looks the same as an invalid code, including timing", async () => {
    const existing = await timed(() => redeem({ code: addInvite(), email: ADMIN_SAME.email }));
    const invalid = await timed(() => redeem({ code: "NOSUCHCODE", email: "someone@example.test" }));
    expect(existing.res.status).toBe(invalid.res.status);
    expect(existing.body).toEqual(invalid.body);
    expect(existing.ms).toBeGreaterThanOrEqual(REDEEM_FAILURE_MIN_MS - 5);
    expect(invalid.ms).toBeGreaterThanOrEqual(REDEEM_FAILURE_MIN_MS - 5);
  });

  it("rejects a code that has been used up", async () => {
    const code = addInvite();
    expect((await redeem({ code, email: "first@example.test" })).status).toBe(200);
    const second = await redeem({ code, email: "second@example.test" });
    expect(second.status).toBe(400);
    expect(await second.json()).toEqual({ error: "Invalid invite code" });
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
  });

  it("allows up to max_uses redemptions", async () => {
    const code = addInvite({ max_uses: 2 });
    expect((await redeem({ code, email: "one@example.test" })).status).toBe(200);
    expect((await redeem({ code, email: "two@example.test" })).status).toBe(200);
    expect((await redeem({ code, email: "three@example.test" })).status).toBe(400);
  });

  it("rejects an expired code", async () => {
    const code = addInvite({ expired: true });
    const res = await redeem({ code, email: "late@example.test" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid invite code" });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("rejects a code of another type with the generic message", async () => {
    const code = addInvite({ type: "operative" });
    const res = await redeem({ code, email: "x@example.test" });
    expect(await res.json()).toEqual({ error: "Invalid invite code" });
  });

  it("gives the use back and fails generically when the auth account already exists", async () => {
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: new Error("already registered") });
    const code = addInvite();
    const res = await redeem({ code, email: "auth-only@example.test" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid invite code" });
    expect(mockInvites[code].use_count).toBe(0);
    expect(usersWrites()).toEqual([]);
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it("rate limits per IP", async () => {
    const ip = nextIp();
    for (let i = 0; i < REDEEM_RATE_LIMITS.perIp.max; i++) {
      expect((await redeem({}, ip)).status).toBe(400);
    }
    const blocked = await redeem({}, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("rate limits per code across IPs", async () => {
    const code = addInvite({ max_uses: 100 });
    for (let i = 0; i < REDEEM_RATE_LIMITS.perCode.max; i++) {
      expect((await redeem({ code, email: `user${i}@example.test` })).status).toBe(200);
    }
    expect((await redeem({ code, email: "one-more@example.test" })).status).toBe(429);
  });
});

describe("POST /api/invite-codes", () => {
  function create(signedInAs?: UserRow, siteId = SITE_A) {
    if (signedInAs) {
      mockGetUser.mockResolvedValue({ data: { user: { id: signedInAs.id, email: signedInAs.email } }, error: null });
    }
    return createCodePost(
      new Request("http://localhost/api/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(signedInAs ? { authorization: "Bearer valid-token" } : {}) },
        body: JSON.stringify({ siteId }),
      })
    );
  }

  it("returns 401 with no credentials", async () => {
    expect((await create()).status).toBe(401);
  });

  it("returns 403 for an operative of the site's company", async () => {
    const res = await create(OPERATIVE);
    expect(res.status).toBe(403);
    expect(mockWrites).toEqual([]);
  });

  it.each([ADMIN_SAME, SUPERVISOR_SAME, SITE_ADMIN_SAME, SUB_ADMIN_SAME, SUPERUSER])("$role creates a code", async (caller) => {
    const res = await create(caller);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["code", "siteId", "site_id"]);
    expect(body.code).toMatch(new RegExp(`^[A-HJ-NP-Z2-9]{${INVITE_CODE_LENGTH}}$`));
  });

  it("returns 403 for an admin of a different company", async () => {
    const res = await create(ADMIN_OTHER);
    expect(res.status).toBe(403);
    expect(mockWrites).toEqual([]);
  });

  it("does not use Math.random", async () => {
    const spy = jest.spyOn(Math, "random");
    try {
      await create(ADMIN_SAME);
      generateInviteCode();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
