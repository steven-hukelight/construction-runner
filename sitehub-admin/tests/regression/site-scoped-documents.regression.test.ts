/**
 * @jest-environment node
 *
 * Mobile document lists show one site at a time: an operative never receives
 * RAMS for a site they are not inducted on, but company-wide RAMS stay visible.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
jest.mock("@/app/api/_utils/mobileAuth", () => ({
  resolveMobileApiAuth: jest.fn().mockResolvedValue({
    uid: "op-1",
    role: "operative",
    companyId: "test-company-id",
    userEmail: "op@test.com",
    isSuperuser: false,
  }),
}));

import { clearMockCookies, jsonRequest, setMockCookies } from "./helpers";
import { mockSupabaseCalls, mockSupabaseResponseQueue } from "../mocks/supabase";

const mobile = { "X-Client": "mobile" };

beforeEach(() => {
  clearMockCookies();
  mockSupabaseResponseQueue.length = 0;
  mockSupabaseCalls.length = 0;
  setMockCookies({ role: "operative", companyId: "test-company-id", uid: "op-1" });
});

describe("Site-scoped RAMS for operatives on mobile", () => {
  it("returns nothing for a site the operative is not inducted on", async () => {
    mockSupabaseResponseQueue.push({
      data: [{ site_id: "site-a", status: "completed", completed_at: new Date().toISOString() }],
      error: null,
    });

    const { GET } = await import("@/app/api/rams/route");
    const res = await GET(jsonRequest("http://test/api/rams?siteId=site-b", { headers: mobile }));

    expect(await res.json()).toEqual([]);
    expect(mockSupabaseCalls.some((c) => c.table === "rams")).toBe(false);
  });

  it("still shows company-wide RAMS when an older build is not signed in anywhere", async () => {
    mockSupabaseResponseQueue.push(
      { data: null, error: null },
      { data: [{ id: "cw-1", site_wide: true, site_id: null }], error: null },
      { data: [{ id: "site-b" }], error: null }
    );

    const { GET } = await import("@/app/api/rams/route");
    const res = await GET(jsonRequest("http://test/api/rams", { headers: mobile }));
    const body = (await res.json()) as { id: string }[];

    expect(body.map((r) => r.id)).toEqual(["cw-1"]);
    const ramsFilters = mockSupabaseCalls.filter((c) => c.table === "rams");
    expect(ramsFilters).toContainEqual({ table: "rams", method: "eq", args: ["site_wide", true] });
    expect(ramsFilters.some((c) => c.method === "in")).toBe(false);
  });

  it("shows the selected inducted site plus company-wide RAMS", async () => {
    mockSupabaseResponseQueue.push(
      {
        data: [{ site_id: "site-a", status: "completed", completed_at: new Date().toISOString() }],
        error: null,
      },
      { data: [{ id: "r-a", site_id: "site-a" }], error: null },
      { data: [{ id: "site-a" }, { id: "site-b" }], error: null },
      { data: [], error: null }
    );

    const { GET } = await import("@/app/api/rams/route");
    await GET(jsonRequest("http://test/api/rams?siteId=site-a", { headers: mobile }));

    expect(mockSupabaseCalls).toContainEqual({
      table: "rams",
      method: "or",
      args: ["site_id.eq.site-a,site_wide.eq.true"],
    });
    expect(mockSupabaseCalls).toContainEqual({ table: "rams", method: "in", args: ["site_id", ["site-a"]] });
  });
});
