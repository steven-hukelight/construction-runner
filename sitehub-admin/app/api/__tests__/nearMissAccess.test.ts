/**
 * @jest-environment node
 */
type Row = Record<string, unknown>;

const mockRows: Record<string, Row[]> = {};
const mockInserts: Array<{ table: string; row: Row }> = [];
const mockUpdates: Array<{ table: string; values: Row }> = [];
const mockDeletes: string[] = [];
const mockTablesRead: string[] = [];
const mockCookies: Record<string, string> = {};
const mockGetUser = jest.fn();
const mockValidateSession = jest.fn();
const mockCreateSignedUrl = jest.fn();

function mockBuilder(table: string) {
  mockTablesRead.push(table);
  const filters: Array<(r: Row) => boolean> = [];
  let pending: { kind: "insert"; row: Row } | { kind: "update"; values: Row } | { kind: "delete" } | null = null;
  const matches = () => (mockRows[table] ?? []).filter((r) => filters.every((f) => f(r)));
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "limit", "order", "not"]) builder[m] = () => builder;
  builder.eq = (k: string, v: unknown) => {
    filters.push((r) => r[k] === v);
    return builder;
  };
  builder.in = (k: string, vs: unknown[]) => {
    filters.push((r) => vs.includes(r[k]));
    return builder;
  };
  builder.is = (k: string, v: unknown) => {
    filters.push((r) => (r[k] ?? null) === v);
    return builder;
  };
  builder.insert = (row: Row) => {
    pending = { kind: "insert", row };
    mockInserts.push({ table, row });
    return builder;
  };
  builder.update = (values: Row) => {
    pending = { kind: "update", values };
    mockUpdates.push({ table, values });
    return builder;
  };
  builder.delete = () => {
    pending = { kind: "delete" };
    mockDeletes.push(table);
    return builder;
  };
  const single = async () =>
    pending?.kind === "insert"
      ? { data: { id: "new-report" }, error: null }
      : { data: matches()[0] ?? null, error: null };
  builder.maybeSingle = single;
  builder.single = single;
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(
      pending ? { data: null, error: null } : { data: matches(), count: matches().length, error: null }
    ).then(resolve, reject);
  return builder;
}

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (table: string) => mockBuilder(table),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
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
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
jest.mock("@/app/dashboard/health-and-safety/near-miss/[id]/NearMissDetailClient", () => ({
  __esModule: true,
  default: function NearMissDetailClient() {
    return null;
  },
}));
jest.mock("@/lib/auth/companyId", () => ({ resolveCompanyId: async () => null }));
jest.mock("@/supabase/storage/storageClient", () => ({
  createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
}));
jest.mock("@/lib/pdf/resolveCompanyPdfBranding", () => ({ resolveCompanyPdfBranding: async () => null }));
jest.mock("@/lib/pdf/createReportPdf", () => ({
  createReportPdf: () => ({
    doc: {},
    margin: 0,
    y: 0,
    section: () => {},
    field: () => {},
    paragraph: () => {},
    setY: () => {},
    toUint8Array: () => new Uint8Array([37, 80, 68, 70]),
  }),
}));

import { GET as listGet, POST as listPost } from "@/app/api/near-miss/route";
import { GET as reportGet, PATCH as reportPatch, DELETE as reportDelete } from "@/app/api/near-miss/[id]/route";
import NearMissDetailPage from "@/app/dashboard/health-and-safety/near-miss/[id]/page";
import { GET as exportGet } from "@/app/api/near-miss/[id]/export/route";
import { GET as openAttachmentGet } from "@/app/api/near-miss/open-attachment/route";
import { findNearMissAttachment } from "@/lib/auth/nearMissAccess";
import { canRoleViewNearMiss } from "@/lib/auth/nearMissRoles";

const COMPANY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
type UserRow = { id: string; company_id: string | null; role: string; email: string };
const user = (n: number, company_id: string | null, role: string): UserRow => ({
  id: `70000000-0000-4000-8000-00000000000${n}`,
  company_id,
  role,
  email: `${role}${n}@example.test`,
});

const ADMIN_SAME = user(1, COMPANY_A, "admin");
const SUPERVISOR_SAME = user(2, COMPANY_A, "supervisor");
const ADMIN_OTHER = user(3, COMPANY_B, "admin");
const SUPERUSER = user(4, null, "superuser");
const OPERATIVE = user(5, COMPANY_A, "operative");
const SITE_ADMIN = user(6, COMPANY_A, "site_admin");
const SUB_ADMIN = user(7, COMPANY_A, "sub_admin");
const USERS = [ADMIN_SAME, SUPERVISOR_SAME, ADMIN_OTHER, SUPERUSER, OPERATIVE, SITE_ADMIN, SUB_ADMIN];

const SITE_A = "site-a";
const SITE_B = "site-b";
const STORAGE = "https://project.supabase.co/storage/v1/object/public";
const ATTACHMENT_URL = `${STORAGE}/asset_photos/near_miss/1700000000000-photo.jpg`;
const ATTACHMENT_PATH = "near_miss/1700000000001-second.jpg";
const SIGNED = "https://project.supabase.co/signed?token=t";

const REPORT_A = {
  id: "report-a",
  company_id: COMPANY_A,
  site_id: SITE_A,
  reported_by: OPERATIVE.id,
  reviewed_at: null,
  description: "test",
  created_at: "2026-10-01T09:00:00.000Z",
  attachments: [ATTACHMENT_URL, { url: ATTACHMENT_PATH, name: "second" }],
};
const REPORT_B = {
  id: "report-b",
  company_id: COMPANY_B,
  site_id: SITE_B,
  reported_by: ADMIN_OTHER.id,
  reviewed_at: null,
  description: "test",
  created_at: "2026-10-01T09:00:00.000Z",
  attachments: [],
};

let signedIn = false;
function signInAs(caller: UserRow) {
  signedIn = true;
  mockGetUser.mockResolvedValue({ data: { user: { id: caller.id, email: caller.email } }, error: null });
}

function req(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = signedIn ? { authorization: "Bearer valid-token" } : {};
  if (init.body) headers["content-type"] = "application/json";
  return new Request(`http://localhost${path}`, { ...init, headers });
}
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const openAttachment = (url: string | null, reportId: string | null) => {
  const qs = new URLSearchParams();
  if (url !== null) qs.set("url", url);
  if (reportId !== null) qs.set("reportId", reportId);
  return openAttachmentGet(req(`/api/near-miss/open-attachment?${qs}`));
};

beforeEach(() => {
  signedIn = false;
  for (const k of Object.keys(mockRows)) delete mockRows[k];
  mockInserts.length = 0;
  mockUpdates.length = 0;
  mockDeletes.length = 0;
  mockTablesRead.length = 0;
  for (const k of Object.keys(mockCookies)) delete mockCookies[k];
  mockValidateSession.mockReset().mockResolvedValue({ valid: false, reason: "session_not_found" });
  mockRows.users = USERS.map((u) => ({ ...u }));
  mockRows.sites = [
    { id: SITE_A, name: "Site A", company_id: COMPANY_A },
    { id: SITE_B, name: "Site B", company_id: COMPANY_B },
  ];
  mockRows.user_sites = [{ user_id: SUPERVISOR_SAME.id, site_id: SITE_A }];
  mockRows.near_miss_reports = [{ ...REPORT_A }, { ...REPORT_B }];
  mockGetUser.mockReset().mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  mockCreateSignedUrl.mockReset().mockResolvedValue(SIGNED);
});

/** Every near-miss read path, called for REPORT_A, with the success status a permitted caller gets. */
const ENDPOINTS: Array<[string, () => Promise<Response>, number]> = [
  ["GET /api/near-miss", () => listGet(req("/api/near-miss")), 200],
  ["GET /api/near-miss?count=unreviewed", () => listGet(req("/api/near-miss?count=unreviewed")), 200],
  ["GET /api/near-miss/[id]", () => reportGet(req(`/api/near-miss/${REPORT_A.id}`), idParams(REPORT_A.id)), 200],
  [
    "PATCH /api/near-miss/[id]",
    () =>
      reportPatch(
        req(`/api/near-miss/${REPORT_A.id}`, {
          method: "PATCH",
          body: JSON.stringify({ reviewedAt: "2026-10-05T10:00:00.000Z" }),
        }),
        idParams(REPORT_A.id)
      ),
    200,
  ],
  [
    "DELETE /api/near-miss/[id]",
    () => reportDelete(req(`/api/near-miss/${REPORT_A.id}`, { method: "DELETE" }), idParams(REPORT_A.id)),
    200,
  ],
  [
    "GET /api/near-miss/[id]/export",
    () => exportGet(req(`/api/near-miss/${REPORT_A.id}/export`), idParams(REPORT_A.id)),
    200,
  ],
  ["GET /api/near-miss/open-attachment", () => openAttachment(ATTACHMENT_URL, REPORT_A.id), 302],
];

describe.each(ENDPOINTS)("%s", (label, call, okStatus) => {
  const isList = label === "GET /api/near-miss" || label.endsWith("count=unreviewed");

  it.each([
    ["admin of the same company", ADMIN_SAME],
    ["supervisor of the same company", SUPERVISOR_SAME],
    ["superuser", SUPERUSER],
  ])("allows the %s", async (_who, caller) => {
    signInAs(caller);
    expect((await call()).status).toBe(okStatus);
  });

  it.each([
    ["operative", OPERATIVE],
    ["site_admin", SITE_ADMIN],
    ["sub_admin", SUB_ADMIN],
  ])("returns 403 for a %s of the same company", async (_who, caller) => {
    signInAs(caller);
    const res = await call();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mockUpdates).toHaveLength(0);
    expect(mockDeletes).toHaveLength(0);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 401 with no credentials", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(mockUpdates).toHaveLength(0);
    expect(mockDeletes).toHaveLength(0);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  if (isList) {
    it("scopes an admin of another company to their own company", async () => {
      signInAs(ADMIN_OTHER);
      const res = await call();
      expect(res.status).toBe(200);
      const body = await res.json();
      if (Array.isArray(body)) expect(body.map((r: { id: string }) => r.id)).toEqual([REPORT_B.id]);
      else expect(body).toEqual({ count: 1 });
    });
  } else {
    it("returns 403 for an admin of a different company", async () => {
      signInAs(ADMIN_OTHER);
      const res = await call();
      expect(res.status).toBe(403);
      expect(mockUpdates).toHaveLength(0);
    expect(mockDeletes).toHaveLength(0);
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    });
  }
});

describe("GET /api/near-miss response shapes", () => {
  it("lists the caller's company for an admin", async () => {
    signInAs(ADMIN_SAME);
    const body = await (await listGet(req("/api/near-miss"))).json();
    expect(body).toEqual([
      expect.objectContaining({ id: REPORT_A.id, site_name: "Site A", attachment_count: 2 }),
    ]);
  });

  it("lets a superuser list every company", async () => {
    signInAs(SUPERUSER);
    const body = await (await listGet(req("/api/near-miss"))).json();
    expect(body.map((r: { id: string }) => r.id).sort()).toEqual([REPORT_A.id, REPORT_B.id]);
  });

  it("returns { count } for a same-company supervisor", async () => {
    signInAs(SUPERVISOR_SAME);
    expect(await (await listGet(req("/api/near-miss?count=unreviewed"))).json()).toEqual({ count: 1 });
  });
});

describe("GET /api/near-miss/open-attachment", () => {
  it("redirects to a signed link for a stored attachment", async () => {
    signInAs(ADMIN_SAME);
    const res = await openAttachment(ATTACHMENT_URL, REPORT_A.id);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(SIGNED);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("asset_photos", "near_miss/1700000000000-photo.jpg", 3600);
  });

  it("matches an object attachment stored as a bare path", async () => {
    signInAs(SUPERVISOR_SAME);
    const res = await openAttachment(`${STORAGE}/asset_photos/${ATTACHMENT_PATH}`, REPORT_A.id);
    expect(res.status).toBe(302);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("asset_photos", ATTACHMENT_PATH, 3600);
  });

  it.each([
    ["another near-miss upload", `${STORAGE}/asset_photos/near_miss/9999-not-on-report.jpg`],
    ["a medical file", `${STORAGE}/medical/medical/${OPERATIVE.id}/scan.pdf`],
    ["a '..' path", `asset_photos/near_miss/../medical/scan.pdf`],
    ["a non-storage URL", "https://example.com/photo.jpg"],
  ])("returns 403 for %s that is not on the report", async (_label, url) => {
    signInAs(ADMIN_SAME);
    const res = await openAttachment(url, REPORT_A.id);
    expect(res.status).toBe(403);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 400 when reportId is missing", async () => {
    signInAs(ADMIN_SAME);
    const res = await openAttachment(ATTACHMENT_URL, null);
    expect(res.status).toBe(400);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 400 when url is missing", async () => {
    signInAs(ADMIN_SAME);
    expect((await openAttachment(null, REPORT_A.id)).status).toBe(400);
  });

  it("returns 404 for a report that does not exist", async () => {
    signInAs(ADMIN_SAME);
    expect((await openAttachment(ATTACHMENT_URL, "missing-report")).status).toBe(404);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 403 for an admin of another company even with a real attachment url", async () => {
    signInAs(ADMIN_OTHER);
    expect((await openAttachment(ATTACHMENT_URL, REPORT_A.id)).status).toBe(403);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/near-miss/[id]", () => {
  it.each([
    ["admin of the same company", ADMIN_SAME],
    ["supervisor of the same company", SUPERVISOR_SAME],
    ["superuser", SUPERUSER],
  ])("deletes the report for the %s", async (_who, caller) => {
    signInAs(caller);
    const res = await reportDelete(req(`/api/near-miss/${REPORT_A.id}`, { method: "DELETE" }), idParams(REPORT_A.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockDeletes).toEqual(["near_miss_reports"]);
  });

  it("returns 404 for a report that does not exist", async () => {
    signInAs(ADMIN_SAME);
    const res = await reportDelete(req("/api/near-miss/missing", { method: "DELETE" }), idParams("missing"));
    expect(res.status).toBe(404);
    expect(mockDeletes).toHaveLength(0);
  });
});

/** Signs in through the web cookie path (verified `session_id` + login cookies), as dashboard pages do. */
function signInWithSession(caller: UserRow) {
  mockValidateSession.mockResolvedValue({ valid: true, userId: caller.id, lastActiveAtMs: Date.now() });
  Object.assign(mockCookies, {
    session_id: "80000000-0000-4000-8000-000000000001",
    uid: caller.id,
    role: caller.role,
    user_email: caller.email,
    ...(caller.company_id ? { companyId: caller.company_id } : {}),
  });
}

const renderPage = (id: string) => NearMissDetailPage({ params: Promise.resolve({ id }) });

describe("dashboard near-miss detail page", () => {
  it.each([
    ["admin of the same company", ADMIN_SAME],
    ["supervisor of the same company", SUPERVISOR_SAME],
    ["superuser", SUPERUSER],
  ])("renders the report with signed attachments for the %s", async (_who, caller) => {
    signInWithSession(caller);
    const page = await renderPage(REPORT_A.id);
    const detail = (page as { props: { children: { props: Record<string, unknown> } } }).props.children.props;
    expect(detail.item).toEqual(expect.objectContaining({ id: REPORT_A.id, site_name: "Site A" }));
    expect(detail.attachmentsWithSignedUrls).toHaveLength(2);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("asset_photos", ATTACHMENT_PATH, 3600);
  });

  it.each([
    ["operative", OPERATIVE],
    ["site_admin", SITE_ADMIN],
    ["sub_admin", SUB_ADMIN],
  ])("redirects a %s to /dashboard before loading or signing anything", async (_who, caller) => {
    signInWithSession(caller);
    await expect(renderPage(REPORT_A.id)).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockTablesRead).not.toContain("near_miss_reports");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("redirects a caller with no verified session to /dashboard", async () => {
    Object.assign(mockCookies, { role: "admin", uid: ADMIN_SAME.id, companyId: COMPANY_A });
    await expect(renderPage(REPORT_A.id)).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockTablesRead).not.toContain("near_miss_reports");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("sends an admin of another company back to the near-miss list without signing", async () => {
    signInWithSession(ADMIN_OTHER);
    await expect(renderPage(REPORT_A.id)).rejects.toThrow("REDIRECT:/dashboard/health-and-safety/near-miss");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns not found for a missing report", async () => {
    signInWithSession(ADMIN_SAME);
    await expect(renderPage("missing")).rejects.toThrow("NOT_FOUND");
  });
});

describe("POST /api/near-miss", () => {
  it("still lets an operative submit a near miss", async () => {
    signInAs(OPERATIVE);
    const res = await listPost(
      req("/api/near-miss", {
        method: "POST",
        body: JSON.stringify({ description: "Loose scaffold board", siteId: SITE_A, attachments: [ATTACHMENT_URL] }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "new-report" });
    expect(mockInserts).toEqual([
      {
        table: "near_miss_reports",
        row: expect.objectContaining({ company_id: COMPANY_A, site_id: SITE_A, attachments: [ATTACHMENT_URL] }),
      },
    ]);
  });

  it("returns 401 with no credentials", async () => {
    const res = await listPost(req("/api/near-miss", { method: "POST", body: JSON.stringify({ siteId: SITE_A }) }));
    expect(res.status).toBe(401);
    expect(mockInserts).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("canRoleViewNearMiss allows admin, supervisor and superuser only", () => {
    expect(["admin", "Supervisor", "superuser"].map(canRoleViewNearMiss)).toEqual([true, true, true]);
    expect(["operative", "site_admin", "sub_admin", "", null].map(canRoleViewNearMiss)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("findNearMissAttachment returns the stored reference only for the report's own uploads", () => {
    expect(findNearMissAttachment(REPORT_A.attachments, ATTACHMENT_URL)).toBe(ATTACHMENT_URL);
    expect(findNearMissAttachment(REPORT_A.attachments, `asset_photos/${ATTACHMENT_PATH}`)).toBe(ATTACHMENT_PATH);
    expect(findNearMissAttachment([`${STORAGE}/medical/medical/${OPERATIVE.id}/a.pdf`], `${STORAGE}/medical/medical/${OPERATIVE.id}/a.pdf`)).toBeNull();
    expect(findNearMissAttachment(null, ATTACHMENT_URL)).toBeNull();
  });
});
