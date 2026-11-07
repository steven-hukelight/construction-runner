/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../../tests/mocks/supabase"));
jest.mock("@/lib/onesignal", () => ({ sendPushToUsers: jest.fn() }));
jest.mock("@/lib/auth/siteAudience", () => ({
  userIdsForSiteContent: jest.fn(async (_companyId: string, siteId: string) =>
    siteId === "site-a" ? ["op-a"] : siteId === "site-b" ? ["op-b"] : [],
  ),
}));

import { trainingAudience, type EnabledModule, type TrainingModuleRow } from "@/lib/training/service";
import { userIdsForSiteContent } from "@/lib/auth/siteAudience";

function enabled(id: string, siteIds: string[] | null): EnabledModule {
  const module = { id, kind: "video", video_path: "x.mp4", external_url: null } as unknown as TrainingModuleRow;
  return { module, refreshMonths: 12, siteIds };
}

describe("trainingAudience", () => {
  it("applies whole-company modules to everyone and site modules only to people on those sites", async () => {
    const applies = await trainingAudience("co-1", [
      enabled("ppe", null),
      enabled("hot-works", ["site-a"]),
      enabled("working-at-height", ["site-a", "site-b"]),
    ]);

    expect(applies("anyone", "ppe")).toBe(true);
    expect(applies("op-a", "hot-works")).toBe(true);
    expect(applies("op-b", "hot-works")).toBe(false);
    expect(applies("op-b", "working-at-height")).toBe(true);
    expect(applies("op-a", "not-enabled")).toBe(false);
  });

  it("treats a site module with no sites as applying to nobody", async () => {
    const applies = await trainingAudience("co-1", [enabled("coshh", [])]);
    expect(applies("op-a", "coshh")).toBe(false);
  });

  it("looks each site up once", async () => {
    (userIdsForSiteContent as jest.Mock).mockClear();
    await trainingAudience("co-1", [enabled("a", ["site-a"]), enabled("b", ["site-a", "site-b"])]);
    expect(userIdsForSiteContent).toHaveBeenCalledTimes(2);
  });
});
