/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../../tests/mocks/supabase"));
jest.mock("@/app/api/_utils/mobileAuth", () => ({ resolveMobileApiAuth: jest.fn() }));

import { assertDocumentSiteAccess, documentSiteScope, rowInSiteScope } from "../auth/siteScope";
import { mockSupabaseResponseQueue } from "../../tests/mocks/supabase";
import { mockCookieStore } from "../../tests/mocks/cookie-store";

const mobileReq = () =>
  new Request("http://test/api/rams", { headers: { "X-Client": "mobile" } });
const webReq = () => new Request("http://test/api/rams");

const recentInduction = (siteId: string) => ({
  site_id: siteId,
  status: "completed",
  completed_at: new Date().toISOString(),
});

const operative = { role: "operative", uid: "op-1", companyId: "co-1" };

beforeEach(() => {
  mockSupabaseResponseQueue.length = 0;
  Object.keys(mockCookieStore).forEach((k) => delete mockCookieStore[k]);
});

describe("documentSiteScope (mobile)", () => {
  it("lets an operative view a site they are inducted on", async () => {
    mockSupabaseResponseQueue.push({ data: [recentInduction("site-a")], error: null });
    await expect(
      documentSiteScope(mobileReq(), { auth: operative, siteId: "site-a" })
    ).resolves.toEqual(["site-a"]);
  });

  it("refuses a site the operative is not inducted on", async () => {
    mockSupabaseResponseQueue.push({ data: [recentInduction("site-a")], error: null });
    await expect(
      documentSiteScope(mobileReq(), { auth: operative, siteId: "site-b" })
    ).resolves.toBe("none");
  });

  it("refuses a site whose induction has expired", async () => {
    mockSupabaseResponseQueue.push({
      data: [{ site_id: "site-a", status: "completed", completed_at: "2020-01-01T00:00:00Z" }],
      error: null,
    });
    await expect(
      documentSiteScope(mobileReq(), { auth: operative, siteId: "site-a" })
    ).resolves.toBe("none");
  });

  it("uses the signed-in site when an older build sends no siteId", async () => {
    mockSupabaseResponseQueue.push({ data: { action: "SIGN_IN", site_id: "site-a" }, error: null });
    await expect(documentSiteScope(mobileReq(), { auth: operative })).resolves.toEqual(["site-a"]);
  });

  it("falls back to company-wide items when the operative is not signed in", async () => {
    mockSupabaseResponseQueue.push({ data: { action: "SIGN_OUT", site_id: "site-a" }, error: null });
    await expect(documentSiteScope(mobileReq(), { auth: operative })).resolves.toBe("site_wide_only");
  });

  it("gives a supervisor all their sites for 'All my sites'", async () => {
    mockSupabaseResponseQueue.push({ data: [{ site_id: "s1" }, { site_id: "s2" }], error: null });
    await expect(
      documentSiteScope(mobileReq(), { auth: { role: "supervisor", uid: "sup-1", companyId: "co-1" } })
    ).resolves.toEqual(["s1", "s2"]);
  });

  it("refuses a supervisor a site they do not manage", async () => {
    mockSupabaseResponseQueue.push({ data: [{ site_id: "s1" }], error: null });
    await expect(
      documentSiteScope(mobileReq(), {
        auth: { role: "supervisor", uid: "sup-1", companyId: "co-1" },
        siteId: "s9",
      })
    ).resolves.toBe("none");
  });

  it("refuses an admin a site from another company", async () => {
    mockSupabaseResponseQueue.push({
      data: { company_id: "co-2", main_contractor_id: null },
      error: null,
    });
    await expect(
      documentSiteScope(mobileReq(), {
        auth: { role: "admin", uid: "ad-1", companyId: "co-1" },
        siteId: "other-site",
      })
    ).resolves.toBe("none");
  });

  it("gives an admin their own company's site, or everything with no siteId", async () => {
    mockSupabaseResponseQueue.push({ data: { company_id: "co-1" }, error: null });
    const admin = { role: "admin", uid: "ad-1", companyId: "co-1" };
    await expect(documentSiteScope(mobileReq(), { auth: admin, siteId: "s1" })).resolves.toEqual(["s1"]);
    await expect(documentSiteScope(mobileReq(), { auth: admin })).resolves.toBe("all");
  });
});

describe("documentSiteScope (web)", () => {
  it("keeps the dashboard cookie behaviour", async () => {
    mockCookieStore.currentSiteId = "site-x";
    await expect(documentSiteScope(webReq(), { role: "admin" })).resolves.toEqual(["site-x"]);
  });
});

describe("rowInSiteScope", () => {
  it("keeps company-wide rows in every scope except none", () => {
    expect(rowInSiteScope({ site_id: "z", site_wide: true }, ["a"])).toBe(true);
    expect(rowInSiteScope({ site_id: "z", site_wide: true }, "site_wide_only")).toBe(true);
    expect(rowInSiteScope({ site_id: "z", site_wide: true }, "none")).toBe(false);
  });

  it("drops other sites and keeps unsited rows only when asked", () => {
    expect(rowInSiteScope({ site_id: "b" }, ["a"])).toBe(false);
    expect(rowInSiteScope({ site_id: null }, ["a"])).toBe(false);
    expect(rowInSiteScope({ site_id: null }, ["a"], { keepUnsited: true })).toBe(true);
  });
});

describe("assertDocumentSiteAccess", () => {
  it("allows an assigned-but-not-yet-inducted site for the induction flow", async () => {
    mockSupabaseResponseQueue.push(
      { data: [], error: null },
      { data: [{ site_id: "site-a" }], error: null }
    );
    await expect(assertDocumentSiteAccess(operative, { site_id: "site-a" })).resolves.toBeNull();
  });

  it("blocks an operative from another site's document", async () => {
    mockSupabaseResponseQueue.push({ data: [], error: null }, { data: [], error: null });
    const res = await assertDocumentSiteAccess(operative, { site_id: "site-b" });
    expect(res?.status).toBe(403);
  });

  it("does not restrict staff", async () => {
    await expect(
      assertDocumentSiteAccess({ role: "supervisor", uid: "s" }, { site_id: "any" })
    ).resolves.toBeNull();
  });
});
