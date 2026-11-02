/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../../tests/mocks/supabase"));

import { staffIdsForSite, userIdsSignedInAtSite } from "../auth/siteAudience";
import { mockSupabaseResponseQueue } from "../../tests/mocks/supabase";

beforeEach(() => {
  mockSupabaseResponseQueue.length = 0;
});

describe("staffIdsForSite", () => {
  it("includes company admins, assigned supervisors and the site manager, and skips another company", async () => {
    // The mock's maybeSingle() takes its response when called; awaited queries take theirs later.
    mockSupabaseResponseQueue.push(
      { data: { manager_id: "mgr-1" }, error: null },
      { data: [{ id: "admin-1" }], error: null },
      { data: [{ user_id: "sup-1" }, { user_id: "other-co" }], error: null },
      {
        data: [
          { id: "sup-1", role: "supervisor", company_id: "co-1" },
          { id: "other-co", role: "supervisor", company_id: "co-2" },
          { id: "mgr-1", role: "operative", company_id: "co-1" },
        ],
        error: null,
      },
    );
    const ids = await staffIdsForSite("co-1", "site-a");
    expect(ids.sort()).toEqual(["admin-1", "mgr-1", "sup-1"]);
  });
});

describe("userIdsSignedInAtSite", () => {
  it("keeps only people whose newest row is an open sign-in at this site", async () => {
    mockSupabaseResponseQueue.push(
      { data: [{ user_id: "on-site" }, { user_id: "left" }, { user_id: "moved" }, { user_id: "on-site" }], error: null },
      {
        data: [
          { user_id: "moved", action: "SIGN IN", site_id: "site-b" },
          { user_id: "left", action: "SIGN OUT", site_id: "site-a" },
          { user_id: "on-site", action: "SIGN IN", site_id: "site-a" },
          { user_id: "left", action: "SIGN IN", site_id: "site-a" },
          { user_id: "moved", action: "SIGN IN", site_id: "site-a" },
        ],
        error: null,
      },
    );
    await expect(userIdsSignedInAtSite("site-a")).resolves.toEqual(["on-site"]);
  });
});
