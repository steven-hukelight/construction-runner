/**
 * @jest-environment node
 */
type TableResult = { data: unknown; error?: unknown };
type UserRow = { id: string; company_id: string | null; role: string; email: string };

const mockUsers: Record<string, UserRow> = {};
const mockGetUser = jest.fn();
const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockWriteMyInfo = jest.fn();

function mockBuilder(table: string) {
  const filters: Record<string, unknown> = {};
  const result = (): TableResult => {
    if (table === "users") {
      const id = filters.id as string | undefined;
      return { data: (id && mockUsers[id]) || null, error: null };
    }
    return { data: null, error: null };
  };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "is", "in", "not", "order", "limit", "update", "insert", "upsert", "delete", "ilike"]) {
    builder[m] = () => builder;
  }
  builder.eq = (column: string, value: unknown) => {
    filters[column] = value;
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
jest.mock("@/lib/auditLog", () => ({ writeAuditLog: async () => {} }));
jest.mock("@/supabase/storage/storageClient", () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
  createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
}));
jest.mock("@/lib/myInfo", () => ({
  readMyInfo: async (userId: string) => ({ userId }),
  writeMyInfo: (...args: unknown[]) => mockWriteMyInfo(...args),
}));

import { POST as uploadPost } from "@/app/api/pre-induction/upload/route";
import { POST as deleteDocumentPost } from "@/app/api/pre-induction/delete-document/route";
import { GET as fileGet } from "@/app/api/pre-induction/file/route";
import { GET as preInductionGet } from "@/app/api/pre-induction/route";
import { GET as myInfoGet, PUT as myInfoPut } from "@/app/api/admin/users/[id]/info/route";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";

const COMPANY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const user = (id: string, company_id: string | null, role: string): UserRow => ({ id, company_id, role, email: `${role}-${id.slice(-4)}@example.test` });

const OPERATIVE = user("20000000-0000-4000-8000-000000000001", COMPANY_A, "operative");
const OTHER_OPERATIVE = user("20000000-0000-4000-8000-000000000002", COMPANY_A, "operative");
const ADMIN_SAME = user("20000000-0000-4000-8000-000000000003", COMPANY_A, "admin");
const ADMIN_OTHER = user("20000000-0000-4000-8000-000000000004", COMPANY_B, "admin");
const SUPERVISOR_SAME = user("20000000-0000-4000-8000-000000000005", COMPANY_A, "supervisor");
const SITE_ADMIN_SAME = user("20000000-0000-4000-8000-000000000006", COMPANY_A, "site_admin");
const SUB_ADMIN_SAME = user("20000000-0000-4000-8000-000000000007", COMPANY_A, "sub_admin");
const SUPERUSER = user("20000000-0000-4000-8000-000000000008", null, "superuser");
const ALL_USERS = [OPERATIVE, OTHER_OPERATIVE, ADMIN_SAME, ADMIN_OTHER, SUPERVISOR_SAME, SITE_ADMIN_SAME, SUB_ADMIN_SAME, SUPERUSER];

const PDF = Buffer.from("%PDF-1.4").toString("base64");

function headers(signedIn: boolean): Record<string, string> {
  return signedIn
    ? { "Content-Type": "application/json", authorization: "Bearer valid-token" }
    : { "Content-Type": "application/json" };
}

function post(path: string, body: unknown, signedIn = true) {
  return new Request(`http://localhost${path}`, { method: "POST", headers: headers(signedIn), body: JSON.stringify(body) });
}

function get(path: string, signedIn = true) {
  return new Request(`http://localhost${path}`, { headers: { ...headers(signedIn), accept: "application/json" } });
}

let signedIn = false;
function signInAs(caller: UserRow) {
  signedIn = true;
  mockGetUser.mockResolvedValue({ data: { user: { id: caller.id, email: caller.email } }, error: null });
}

/** Calls a route on behalf of the current caller, acting on `target`. */
type RouteCall = (target: string) => Promise<Response>;

const ROUTES: Array<[string, RouteCall, number]> = [
  [
    "POST /api/pre-induction/upload",
    (target) =>
      uploadPost(post("/api/pre-induction/upload", { userId: target, sectionId: "medical", fieldName: "medicalCertificate", fileName: "cert.pdf", fileBase64: PDF }, signedIn)),
    200,
  ],
  [
    "POST /api/pre-induction/delete-document",
    (target) => deleteDocumentPost(post("/api/pre-induction/delete-document", { userId: target, path: `${target}/medical/cert.pdf` }, signedIn)),
    200,
  ],
  [
    "GET /api/pre-induction/file",
    (target) => fileGet(get(`/api/pre-induction/file?client=app&path=${encodeURIComponent(`${target}/medical/cert.pdf`)}`, signedIn)),
    200,
  ],
  [
    "GET /api/pre-induction",
    (target) => preInductionGet(get(`/api/pre-induction?userId=${target}`, signedIn)),
    200,
  ],
  [
    "GET /api/admin/users/[id]/info",
    (target) => myInfoGet(get(`/api/admin/users/${target}/info`, signedIn), { params: Promise.resolve({ id: target }) }),
    200,
  ],
  [
    "PUT /api/admin/users/[id]/info",
    (target) =>
      myInfoPut(
        new Request(`http://localhost/api/admin/users/${target}/info`, { method: "PUT", headers: headers(signedIn), body: JSON.stringify({}) }),
        { params: Promise.resolve({ id: target }) }
      ),
    200,
  ],
];

beforeEach(() => {
  signedIn = false;
  for (const k of Object.keys(mockUsers)) delete mockUsers[k];
  for (const u of ALL_USERS) mockUsers[u.id] = u;
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  mockUploadFile.mockReset().mockResolvedValue({ path: "ok" });
  mockDeleteFile.mockReset().mockResolvedValue(undefined);
  mockCreateSignedUrl.mockReset().mockResolvedValue("https://storage.test/signed");
  mockWriteMyInfo.mockReset().mockResolvedValue({ ok: true });
});

describe.each(ROUTES)("%s ownership", (_name, call, okStatus) => {
  it("returns 401 with no credentials", async () => {
    expect((await call(OPERATIVE.id)).status).toBe(401);
  });

  it("allows the caller's own record", async () => {
    signInAs(OPERATIVE);
    expect((await call(OPERATIVE.id)).status).toBe(okStatus);
  });

  it("returns 403 for another user's record", async () => {
    signInAs(OPERATIVE);
    const res = await call(OTHER_OPERATIVE.id);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it.each([ADMIN_SAME, SUPERVISOR_SAME, SITE_ADMIN_SAME, SUB_ADMIN_SAME])("allows $role of the same company", async (manager) => {
    signInAs(manager);
    expect((await call(OPERATIVE.id)).status).toBe(okStatus);
  });

  it("returns 403 for an admin of a different company", async () => {
    signInAs(ADMIN_OTHER);
    const res = await call(OPERATIVE.id);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("allows a superuser", async () => {
    signInAs(SUPERUSER);
    expect((await call(OPERATIVE.id)).status).toBe(okStatus);
  });
});

describe("body and query user ids are not trusted", () => {
  it("upload ignores body.uid and authorizes the bearer token's user", async () => {
    signInAs(OTHER_OPERATIVE);
    const res = await uploadPost(
      post("/api/pre-induction/upload", { userId: OPERATIVE.id, uid: OPERATIVE.id, sectionId: "medical", fieldName: "x", fileName: "a.pdf", fileBase64: PDF })
    );
    expect(res.status).toBe(403);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("upload with body.uid but no verified credentials is 401", async () => {
    const res = await uploadPost(
      post("/api/pre-induction/upload", { userId: OPERATIVE.id, uid: OPERATIVE.id, sectionId: "medical", fieldName: "x", fileName: "a.pdf", fileBase64: PDF }, false)
    );
    expect(res.status).toBe(401);
  });

  it("delete-document ignores body.uid", async () => {
    signInAs(OTHER_OPERATIVE);
    const res = await deleteDocumentPost(
      post("/api/pre-induction/delete-document", { userId: OPERATIVE.id, uid: OPERATIVE.id, path: `${OPERATIVE.id}/medical/a.pdf` })
    );
    expect(res.status).toBe(403);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("file ignores the uid query parameter", async () => {
    signInAs(OTHER_OPERATIVE);
    const res = await fileGet(get(`/api/pre-induction/file?client=app&uid=${OPERATIVE.id}&path=${OPERATIVE.id}/medical/a.pdf`));
    expect(res.status).toBe(403);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("resolvePreInductionAuth returns the verified bearer user", async () => {
    signInAs(OPERATIVE);
    const auth = await resolvePreInductionAuth({ req: get("/api/attendance") });
    expect(auth).toEqual({ uid: OPERATIVE.id, role: "operative", companyId: COMPANY_A, userEmail: OPERATIVE.email });
  });

  it("resolvePreInductionAuth returns no identity for an invalid bearer token", async () => {
    const auth = await resolvePreInductionAuth({ req: get("/api/attendance") });
    expect(auth).toEqual({ uid: null, role: null, companyId: null, userEmail: null });
  });
});

describe("storage paths", () => {
  it("file rejects a path that climbs into another user's folder", async () => {
    signInAs(OPERATIVE);
    const res = await fileGet(get(`/api/pre-induction/file?client=app&path=${OPERATIVE.id}/../${OTHER_OPERATIVE.id}/medical/a.pdf`));
    expect(res.status).toBe(400);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("delete-document rejects a traversal path", async () => {
    signInAs(OPERATIVE);
    const res = await deleteDocumentPost(
      post("/api/pre-induction/delete-document", { userId: OPERATIVE.id, path: `${OPERATIVE.id}/../${OTHER_OPERATIVE.id}/a.pdf` })
    );
    expect(res.status).toBe(400);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("upload rejects a section id containing a slash", async () => {
    signInAs(OPERATIVE);
    const res = await uploadPost(
      post("/api/pre-induction/upload", { userId: OPERATIVE.id, sectionId: "../x", fieldName: "y", fileName: "a.pdf", fileBase64: PDF })
    );
    expect(res.status).toBe(400);
  });
});

describe("response shapes stay the same", () => {
  it("upload returns { ok, path, fileUrl } under the caller's folder", async () => {
    signInAs(OPERATIVE);
    const res = await uploadPost(
      post("/api/pre-induction/upload", { userId: OPERATIVE.id, sectionId: "medical", fieldName: "medicalCertificate", fileName: "cert.pdf", fileBase64: PDF })
    );
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["fileUrl", "ok", "path"]);
    expect(body.path.startsWith(`${OPERATIVE.id}/medical/`)).toBe(true);
  });

  it("file returns { url } for the app", async () => {
    signInAs(OPERATIVE);
    const res = await fileGet(get(`/api/pre-induction/file?client=app&path=${OPERATIVE.id}/medical/cert.pdf`));
    expect(await res.json()).toEqual({ url: "https://storage.test/signed" });
  });

  it("PUT my-info records the admin as the actor", async () => {
    signInAs(ADMIN_SAME);
    const res = await myInfoPut(
      new Request(`http://localhost/api/admin/users/${OPERATIVE.id}/info`, { method: "PUT", headers: headers(true), body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: OPERATIVE.id }) }
    );
    expect(await res.json()).toEqual({ success: true });
    expect(mockWriteMyInfo).toHaveBeenCalledWith(
      OPERATIVE.id,
      {},
      expect.objectContaining({ editingOnBehalf: true, actorUserId: ADMIN_SAME.id })
    );
  });
});
