/**
 * @jest-environment node
 */
type TableResult = { data: unknown; error?: unknown };
type UserRow = { id: string; company_id: string | null; role: string; email: string };

const mockUsers: Record<string, UserRow> = {};
const mockTables: Record<string, TableResult> = {};
const mockUpserts: Array<{ table: string; payload: unknown }> = [];
const mockGetUser = jest.fn();

function mockBuilder(table: string) {
  const filters: Record<string, unknown> = {};
  const result = (): TableResult => {
    if (table === "users") {
      const id = filters.id as string | undefined;
      return { data: (id && mockUsers[id]) || null, error: null };
    }
    return mockTables[table] ?? { data: null, error: null };
  };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "is", "in", "not", "order", "limit", "update", "insert", "delete", "ilike"]) {
    builder[m] = () => builder;
  }
  builder.eq = (column: string, value: unknown) => {
    filters[column] = value;
    return builder;
  };
  builder.upsert = (payload: unknown) => {
    mockUpserts.push({ table, payload });
    return builder;
  };
  builder.maybeSingle = async () => result();
  builder.single = async () => result();
  builder.then = (resolve: (v: TableResult) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(resolve, reject);
  return builder;
}

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (table: string) => mockBuilder(table),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    storage: {
      from: () => ({
        upload: async (path: string) => ({ data: { path }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
      }),
    },
  },
}));

jest.mock("@/lib/sessions", () => ({
  validateSession: async () => ({ valid: false, reason: "session_not_found" }),
  updateSessionActivity: async () => {},
  SESSION_ACTIVITY_WRITE_THROTTLE_MS: 5 * 60 * 1000,
}));

jest.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}));

jest.mock("@/lib/auth/companyId", () => ({ resolveCompanyId: async () => null }));
jest.mock("@/app/api/pre-induction/[userId]/_utils/status", () => ({ updatePreInductionStatus: async () => {} }));
jest.mock("@/lib/auditLog", () => ({ writeAuditLog: async () => {} }));
jest.mock("@/lib/clamav", () => ({ scanBufferWithClam: async () => ({ ok: true, result: "clean" }) }));

import { POST as certificationsPost } from "@/app/api/pre-induction/[userId]/certifications/route";
import { POST as competencyCardPost } from "@/app/api/pre-induction/[userId]/competency-card/route";
import { POST as declarationsPost } from "@/app/api/pre-induction/[userId]/declarations/route";
import { POST as medicalPost } from "@/app/api/pre-induction/[userId]/medical/route";
import { POST as personalPost } from "@/app/api/pre-induction/[userId]/personal/route";
import { POST as refreshStatusPost } from "@/app/api/pre-induction/[userId]/refresh-status/route";
import { POST as rightToWorkPost } from "@/app/api/pre-induction/[userId]/right-to-work/route";
import { POST as trainingPost } from "@/app/api/pre-induction/[userId]/training/route";
import { POST as ramsAcceptPost } from "@/app/api/rams/accept/route";
import { POST as ramsAcknowledgePost } from "@/app/api/rams/acknowledge/route";
import { POST as ramsSignaturePost } from "@/app/api/rams/upload-signature/route";
import { POST as briefingsAcceptPost } from "@/app/api/briefings/accept/route";
import { POST as briefingsSignaturePost } from "@/app/api/briefings/upload-signature/route";
import { POST as medicalUploadPost } from "@/app/api/uploads/medical/route";

const COMPANY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const user = (id: string, company_id: string | null, role: string): UserRow => ({ id, company_id, role, email: `${role}-${id.slice(0, 4)}@example.test` });

const OPERATIVE = user("10000000-0000-4000-8000-000000000001", COMPANY_A, "operative");
const OTHER_OPERATIVE = user("10000000-0000-4000-8000-000000000002", COMPANY_A, "operative");
const ADMIN_SAME = user("10000000-0000-4000-8000-000000000003", COMPANY_A, "admin");
const ADMIN_OTHER = user("10000000-0000-4000-8000-000000000004", COMPANY_B, "admin");
const SUPERVISOR_SAME = user("10000000-0000-4000-8000-000000000005", COMPANY_A, "supervisor");
const SITE_ADMIN_SAME = user("10000000-0000-4000-8000-000000000006", COMPANY_A, "site_admin");
const SUB_ADMIN_SAME = user("10000000-0000-4000-8000-000000000007", COMPANY_A, "sub_admin");
const SUPERUSER = user("10000000-0000-4000-8000-000000000008", null, "superuser");

const SIGNATURE_PNG = Buffer.from("png").toString("base64");

/** Calls a route as `caller` (Flutter Bearer path) acting on `targetUserId`; `undefined` omits the id from the body. */
type RouteCall = (targetUserId: string | undefined) => Promise<Response>;

function bearerRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer valid-token" },
    body: JSON.stringify(body),
  });
}

function preInductionRoute(
  segment: string,
  handler: (req: Request, ctx: { params: Promise<{ userId: string }> }) => Promise<Response>
): [string, RouteCall] {
  return [
    `/api/pre-induction/[userId]/${segment}`,
    (target) =>
      handler(bearerRequest(`/api/pre-induction/${target}/${segment}`, {}), {
        params: Promise.resolve({ userId: target ?? "" }),
      }),
  ];
}

function bodyRoute(
  path: string,
  handler: (req: Request) => Promise<Response>,
  idField: string,
  body: Record<string, unknown>
): [string, RouteCall] {
  return [path, (target) => handler(bearerRequest(path, target === undefined ? body : { ...body, [idField]: target }))];
}

const ROUTES: Array<[string, RouteCall]> = [
  preInductionRoute("certifications", certificationsPost),
  preInductionRoute("competency-card", competencyCardPost),
  preInductionRoute("declarations", declarationsPost),
  preInductionRoute("medical", medicalPost),
  preInductionRoute("personal", personalPost),
  preInductionRoute("refresh-status", refreshStatusPost),
  preInductionRoute("right-to-work", rightToWorkPost),
  preInductionRoute("training", trainingPost),
  bodyRoute("/api/rams/accept", ramsAcceptPost, "userId", { siteId: "site-1" }),
  bodyRoute("/api/rams/acknowledge", ramsAcknowledgePost, "userId", { ramsId: "rams-1", signatureUrl: "https://storage.test/sig.png" }),
  bodyRoute("/api/rams/upload-signature", ramsSignaturePost, "userId", { ramsId: "rams-1", fileBase64: SIGNATURE_PNG }),
  bodyRoute("/api/briefings/accept", briefingsAcceptPost, "userId", { briefingId: "briefing-1", signatureUrl: "https://storage.test/sig.png" }),
  bodyRoute("/api/briefings/upload-signature", briefingsSignaturePost, "userId", { briefingId: "briefing-1", fileBase64: SIGNATURE_PNG }),
  bodyRoute("/api/uploads/medical", medicalUploadPost, "operativeId", { fileName: "note.pdf", fileBase64: SIGNATURE_PNG }),
];

function signInAs(caller: UserRow) {
  mockGetUser.mockResolvedValue({ data: { user: { id: caller.id, email: caller.email } }, error: null });
}

beforeEach(() => {
  for (const k of Object.keys(mockTables)) delete mockTables[k];
  for (const k of Object.keys(mockUsers)) delete mockUsers[k];
  mockUpserts.length = 0;
  for (const u of [OPERATIVE, OTHER_OPERATIVE, ADMIN_SAME, ADMIN_OTHER, SUPERVISOR_SAME, SITE_ADMIN_SAME, SUB_ADMIN_SAME, SUPERUSER]) {
    mockUsers[u.id] = u;
  }
  mockTables.sites = { data: { rams_version: "v1", ramsversion: null } };
  mockTables.assigned_operatives = { data: { id: "assignment-1" } };
  mockTables.rams = { data: { id: "rams-1", company_id: COMPANY_A } };
  mockTables.briefings = { data: { id: "briefing-1", company_id: COMPANY_A } };
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
});

describe.each(ROUTES)("%s ownership", (_path, call) => {
  it("returns 401 with no credentials", async () => {
    expect((await call(OPERATIVE.id)).status).toBe(401);
  });

  it("returns 200 for the caller's own record", async () => {
    signInAs(OPERATIVE);
    expect((await call(OPERATIVE.id)).status).toBe(200);
  });

  it("returns 403 for another user's record", async () => {
    signInAs(OPERATIVE);
    const res = await call(OTHER_OPERATIVE.id);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 200 for an admin of the same company", async () => {
    signInAs(ADMIN_SAME);
    expect((await call(OPERATIVE.id)).status).toBe(200);
  });

  it("returns 403 for an admin of a different company", async () => {
    signInAs(ADMIN_OTHER);
    const res = await call(OPERATIVE.id);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });
});

describe("role rule on a representative route", () => {
  const [, call] = ROUTES.find(([path]) => path === "/api/rams/acknowledge")!;

  it.each([SUPERVISOR_SAME, SITE_ADMIN_SAME, SUB_ADMIN_SAME])("$role of the same company may act on an operative", async (caller) => {
    signInAs(caller);
    expect((await call(OPERATIVE.id)).status).toBe(200);
  });

  it("a superuser may act on a user in any company", async () => {
    signInAs(SUPERUSER);
    expect((await call(OPERATIVE.id)).status).toBe(200);
  });

  it("an operative of the same company may not act on a supervisor", async () => {
    signInAs(OPERATIVE);
    expect((await call(SUPERVISOR_SAME.id)).status).toBe(403);
  });

  it("writes the verified caller's id when the body omits userId", async () => {
    signInAs(OPERATIVE);
    expect((await call(undefined)).status).toBe(200);
    expect(mockUpserts).toEqual([
      { table: "rams_acknowledgements", payload: expect.objectContaining({ user_id: OPERATIVE.id }) },
    ]);
  });
});

describe("response shapes stay the same for the worker app", () => {
  it("rams/upload-signature returns { signatureUrl }", async () => {
    signInAs(OPERATIVE);
    const [, call] = ROUTES.find(([path]) => path === "/api/rams/upload-signature")!;
    const body = await (await call(OPERATIVE.id)).json();
    expect(Object.keys(body)).toEqual(["signatureUrl"]);
  });

  it("briefings/accept returns { success: true }", async () => {
    signInAs(OPERATIVE);
    const [, call] = ROUTES.find(([path]) => path === "/api/briefings/accept")!;
    expect(await (await call(OPERATIVE.id)).json()).toEqual({ success: true });
  });

  it("uploads/medical returns { ok, fileUrl }", async () => {
    signInAs(OPERATIVE);
    const [, call] = ROUTES.find(([path]) => path === "/api/uploads/medical")!;
    expect(Object.keys(await (await call(OPERATIVE.id)).json()).sort()).toEqual(["fileUrl", "ok"]);
  });
});
