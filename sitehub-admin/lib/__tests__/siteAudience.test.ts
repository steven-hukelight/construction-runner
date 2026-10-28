/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../../tests/mocks/supabase"));

import { staffIdsForSite } from "../auth/siteAudience";
import { mockSupabaseResponseQueue } from "../../tests/mocks/supabase";

beforeEach(() => {
  mockSupabaseResponseQueue.length = 0;
});

describe("staffIdsForSite", () => {
  it("includes company admins, assigned supervisors and the site manager, and skips another company", async () => {
    mockSupabaseResponseQueue.push(
      { data: [{ id: "admin-1" }], error: null },
      { data: [{ user_id: "sup-1" }, { user_id: "other-co" }], error: null },
      { data: { manager_id: "mgr-1" }, error: null },
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
