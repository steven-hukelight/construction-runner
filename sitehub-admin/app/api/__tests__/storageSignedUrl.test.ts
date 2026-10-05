/**
 * @jest-environment node
 */
type Row = Record<string, unknown>;

const mockRows: Record<string, Row[]> = {};
const mockGetUser = jest.fn();
const mockCreateSignedUrl = jest.fn();

function mockBuilder(table: string) {
  const eqs: Array<[string, unknown]> = [];
  const ins: Array<[string, unknown[]]> = [];
  const matches = () =>
    (mockRows[table] ?? []).filter(
      (r) => eqs.every(([k, v]) => r[k] === v) && ins.every(([k, vs]) => vs.includes(r[k]))
    );
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "limit", "order"]) builder[m] = () => builder;
  builder.eq = (k: string, v: unknown) => {
    eqs.push([k, v]);
    return builder;
  };
  builder.in = (k: string, vs: unknown[]) => {
    ins.push([k, vs]);
    return builder;
  };
  builder.maybeSingle = async () => ({ data: matches()[0] ?? null, error: null });
  builder.single = async () => ({ data: matches()[0] ?? null, error: null });
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: matches(), error: null }).then(resolve, reject);
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
jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, getAll: () => [] }) }));
jest.mock("@/lib/auth/companyId", () => ({ resolveCompanyId: async () => null }));
jest.mock("@/supabase/storage/storageClient", () => ({
  createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
}));

import { GET as signedUrlGet } from "@/app/api/storage/signed-url/route";
import { storageScope } from "@/lib/storage/privateFile";

const COMPANY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COMPANY_SUB = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
type UserRow = { id: string; company_id: string | null; role: string; email: string };
const user = (n: number, company_id: string | null, role: string): UserRow => ({
  id: `50000000-0000-4000-8000-00000000000${n}`,
  company_id,
  role,
  email: `${role}${n}@example.test`,
});

const OPERATIVE = user(1, COMPANY_A, "operative");
const OTHER_OPERATIVE = user(2, COMPANY_A, "operative");
const ADMIN_SAME = user(3, COMPANY_A, "admin");
const ADMIN_OTHER = user(4, COMPANY_B, "admin");
const SUPERVISOR_SAME = user(5, COMPANY_A, "supervisor");
const SUB_OPERATIVE = user(6, COMPANY_SUB, "operative");
const SUPERUSER = user(7, null, "superuser");
const USERS = [OPERATIVE, OTHER_OPERATIVE, ADMIN_SAME, ADMIN_OTHER, SUPERVISOR_SAME, SUB_OPERATIVE, SUPERUSER];

const SITE_A = "site-a";
const ASSET_A = "60000000-0000-4000-8000-000000000001";
const STORAGE = "https://project.supabase.co/storage/v1/object/public";

let signedIn = false;
function signInAs(caller: UserRow) {
  signedIn = true;
  mockGetUser.mockResolvedValue({ data: { user: { id: caller.id, email: caller.email } }, error: null });
}

function request(stored: string) {
  return signedUrlGet(
    new Request(`http://localhost/api/storage/signed-url?url=${encodeURIComponent(stored)}`, {
      headers: signedIn ? { authorization: "Bearer valid-token" } : {},
    })
  );
}

beforeEach(() => {
  signedIn = false;
  for (const k of Object.keys(mockRows)) delete mockRows[k];
  mockRows.users = USERS.map((u) => ({ ...u }));
  mockRows.sites = [{ id: SITE_A, company_id: COMPANY_A }];
  mockRows.site_subcontractors = [{ site_id: SITE_A, company_id: COMPANY_SUB }];
  mockRows.assigned_operatives = [];
  mockRows.assets = [{ id: ASSET_A, company_id: COMPANY_A, site_id: SITE_A }];
  mockRows.tasks = [{ id: "task-1", company_id: COMPANY_A, site_id: null }];
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  mockCreateSignedUrl.mockReset().mockResolvedValue("https://project.supabase.co/signed?token=t");
});

/** [label, file owned by OPERATIVE] for each per-user layout. */
const OWNED_FILES: Array<[string, string]> = [
  ["pre-induction file", `${STORAGE}/pre-induction/${OPERATIVE.id}/medical/cert.pdf`],
  ["medical record", `${STORAGE}/medical/medical/${OPERATIVE.id}/scan.pdf`],
  ["RAMS signature", `${STORAGE}/company_documents/rams-signatures/${COMPANY_A}/${OPERATIVE.id}/rams-1_1.png`],
  ["briefing signature", `company_documents/briefing-signatures/${COMPANY_A}/${OPERATIVE.id}/b-1_1.png`],
  ["certification upload", `${STORAGE}/uploads/certifications/${OPERATIVE.id}/card.pdf`],
];

const otherOperativeFile = (stored: string) => stored.split(OPERATIVE.id).join(OTHER_OPERATIVE.id);

describe.each(OWNED_FILES)("signed URL for a %s", (_label, stored) => {
  it("returns 401 with no credentials", async () => {
    const res = await request(stored);
    expect(res.status).toBe(401);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 200 { url } for the owner", async () => {
    signInAs(OPERATIVE);
    const res = await request(stored);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://project.supabase.co/signed?token=t" });
  });

  it("returns 403 for another operative's file", async () => {
    signInAs(OPERATIVE);
    const res = await request(otherOperativeFile(stored));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it.each([ADMIN_SAME, SUPERVISOR_SAME])("returns 200 for $role of the same company", async (manager) => {
    signInAs(manager);
    expect((await request(stored)).status).toBe(200);
  });

  it("returns 403 for an admin of a different company", async () => {
    signInAs(ADMIN_OTHER);
    expect((await request(stored)).status).toBe(403);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 200 for a superuser", async () => {
    signInAs(SUPERUSER);
    expect((await request(stored)).status).toBe(200);
  });
});

describe("malformed and unknown paths", () => {
  it.each([
    ["a '..' segment in a raw path", `pre-induction/${OPERATIVE.id}/../${OTHER_OPERATIVE.id}/medical/a.pdf`],
    ["a '..' segment in a signature path", `company_documents/rams-signatures/${COMPANY_A}/../${OPERATIVE.id}/a.png`],
    ["an encoded '..' segment", `${STORAGE}/pre-induction/${OPERATIVE.id}/%2e%2e/${OTHER_OPERATIVE.id}/medical/a.pdf`],
    ["an unknown bucket", `${STORAGE}/secret_bucket/${OPERATIVE.id}/a.pdf`],
    ["an unknown company_documents layout", `${STORAGE}/company_documents/contracts/${COMPANY_A}/a.pdf`],
    ["a pre-induction path without a user id", `${STORAGE}/pre-induction/not-a-user/medical/a.pdf`],
    ["a non-storage URL", "https://example.com/file.pdf"],
  ])("returns 403 for %s", async (_label, stored) => {
    signInAs(OPERATIVE);
    const res = await request(stored);
    expect(res.status).toBe(403);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 400 when the url parameter is missing", async () => {
    signInAs(OPERATIVE);
    const res = await signedUrlGet(new Request("http://localhost/api/storage/signed-url", { headers: { authorization: "Bearer valid-token" } }));
    expect(res.status).toBe(400);
  });
});

describe("company files", () => {
  const ramsDoc = `${STORAGE}/rams/rams/${SITE_A}/1700000000-method.pdf`;

  it("lets an operative of the site's company open a RAMS document", async () => {
    signInAs(OPERATIVE);
    expect((await request(ramsDoc)).status).toBe(200);
  });

  it("lets a subcontractor operative on the site open it", async () => {
    signInAs(SUB_OPERATIVE);
    expect((await request(ramsDoc)).status).toBe(200);
  });

  it("lets an operative assigned to the site open it", async () => {
    const outsider = user(8, COMPANY_B, "operative");
    mockRows.users.push({ ...outsider });
    mockRows.assigned_operatives.push({ id: "assign-1", site_id: SITE_A, user_id: outsider.id });
    signInAs(outsider);
    expect((await request(ramsDoc)).status).toBe(200);
  });

  it("returns 403 for an admin of an unrelated company", async () => {
    signInAs(ADMIN_OTHER);
    expect((await request(ramsDoc)).status).toBe(403);
  });

  it("returns 403 for a site that does not exist", async () => {
    signInAs(OPERATIVE);
    expect((await request(`${STORAGE}/rams/rams/no-such-site/a.pdf`)).status).toBe(403);
  });

  it.each([
    ["briefing PDF", `${STORAGE}/briefings/briefings/${SITE_A}/1-brief.pdf`],
    ["asset image", `${STORAGE}/assets/${ASSET_A}/images/1-photo.jpg`],
    ["asset document", `${STORAGE}/assets/assets/${ASSET_A}/1-manual.pdf`],
    ["task attachment", `${STORAGE}/uploads/tasks/task-1/1-note.pdf`],
    ["site rules file", `${STORAGE}/uploads/site-rules/${COMPANY_A}/rule-1-doc.pdf`],
  ])("%s: same company 200, unrelated company 403", async (_label, stored) => {
    signInAs(OPERATIVE);
    expect((await request(stored)).status).toBe(200);
    signInAs(ADMIN_OTHER);
    expect((await request(stored)).status).toBe(403);
  });

  it("site rules are visible to a subcontractor linked to one of the company's sites", async () => {
    signInAs(SUB_OPERATIVE);
    expect((await request(`${STORAGE}/uploads/site-rules/${COMPANY_A}/rule-1-doc.pdf`)).status).toBe(200);
  });

  it("near-miss attachments (no owner in the path) stay open to any verified user", async () => {
    signInAs(ADMIN_OTHER);
    expect((await request(`${STORAGE}/asset_photos/near_miss/1700000000-photo.jpg`)).status).toBe(200);
  });

  it("near-miss attachments still need credentials", async () => {
    expect((await request(`${STORAGE}/asset_photos/near_miss/1700000000-photo.jpg`)).status).toBe(401);
  });
});

describe("storageScope", () => {
  it("never derives an owner from a traversal path", () => {
    expect(storageScope("medical", `medical/${OPERATIVE.id}/../x`)).toBeNull();
    expect(storageScope("pre-induction", `${OPERATIVE.id}//medical/a.pdf`)).toBeNull();
  });
});
