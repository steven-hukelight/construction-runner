/**
 * @jest-environment node
 *
 * Raise Alarm routes: who may raise, joining an active alarm, who may stand down,
 * and that only this site's people are pushed.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
jest.mock("@/app/api/_utils/mobileAuth", () => ({ resolveMobileApiAuth: jest.fn() }));
jest.mock("@/lib/rateLimit", () => ({ checkRateLimit: jest.fn().mockResolvedValue({ success: true }) }));
jest.mock("@/lib/auditLog", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/url", () => ({ getServerPublicOrigin: () => "https://test" }));
jest.mock("@/lib/onesignal", () => ({ sendPushToUsers: jest.fn().mockResolvedValue({ sent: true }) }));
jest.mock("@/lib/auth/siteScope", () => ({ currentSignedInSiteId: jest.fn() }));
jest.mock("@/lib/auth/siteAudience", () => ({
  userIdsSignedInAtSite: jest.fn(),
  staffIdsForSite: jest.fn(),
}));
jest.mock("@/lib/siteAlarms/service", () => ({
  loadSite: jest.fn(),
  loadAlarm: jest.fn(),
  loadActiveAlarm: jest.fn(),
  isStaffForSite: jest.fn(),
  personDetails: jest.fn(),
  alarmView: jest.fn().mockResolvedValue({ id: "view" }),
}));

import { jsonRequest } from "./helpers";
import { mockSupabaseCalls, mockSupabaseResponseQueue } from "../mocks/supabase";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { sendPushToUsers } from "@/lib/onesignal";
import { currentSignedInSiteId } from "@/lib/auth/siteScope";
import { staffIdsForSite, userIdsSignedInAtSite } from "@/lib/auth/siteAudience";
import { isStaffForSite, loadActiveAlarm, loadAlarm, loadSite, personDetails } from "@/lib/siteAlarms/service";

const site = { id: "site-1", company_id: "co-1", name: "Block A", manager_id: null };

function caller(uid: string, role: string) {
  (resolveMobileApiAuth as jest.Mock).mockResolvedValue({
    uid,
    role,
    companyId: "co-1",
    userEmail: `${uid}@test`,
    isSuperuser: false,
  });
}

function activeAlarm(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    company_id: "co-1",
    site_id: "site-1",
    type: "fire",
    status: "active",
    is_drill: false,
    raised_by: "op-1",
    raised_by_name: "Op One",
    raised_at: new Date().toISOString(),
    additional_raisers: [],
    audience_snapshot: [{ user_id: "op-1", name: "Op One", role: "operative", on_site: true, staff: false }],
    ...overrides,
  };
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabaseResponseQueue.length = 0;
  mockSupabaseCalls.length = 0;
  (loadSite as jest.Mock).mockResolvedValue(site);
  (personDetails as jest.Mock).mockImplementation(async (ids: string[]) => {
    return new Map(ids.map((id) => [id, { name: `Name ${id}`, role: "operative", phone: null }]));
  });
  (staffIdsForSite as jest.Mock).mockResolvedValue(["sup-1"]);
  (userIdsSignedInAtSite as jest.Mock).mockResolvedValue(["op-1", "op-2"]);
});

describe("POST /api/sites/[id]/alarms", () => {
  it("refuses an operative who is not signed in to the site", async () => {
    caller("op-9", "operative");
    (isStaffForSite as jest.Mock).mockResolvedValue(false);
    (currentSignedInSiteId as jest.Mock).mockResolvedValue("another-site");

    const { POST } = await import("@/app/api/sites/[id]/alarms/route");
    const res = await POST(jsonRequest("http://test/api/sites/site-1/alarms", { method: "POST", body: { type: "fire" } }), params("site-1"));

    expect(res.status).toBe(403);
    expect(sendPushToUsers).not.toHaveBeenCalled();
    expect(mockSupabaseCalls.some((c) => c.table === "site_alarms")).toBe(false);
  });

  it("joins an active alarm instead of raising a second one, and sends no push", async () => {
    caller("op-2", "operative");
    (isStaffForSite as jest.Mock).mockResolvedValue(false);
    (currentSignedInSiteId as jest.Mock).mockResolvedValue("site-1");
    (loadActiveAlarm as jest.Mock).mockResolvedValue(activeAlarm());
    mockSupabaseResponseQueue.push({ data: activeAlarm(), error: null });

    const { POST } = await import("@/app/api/sites/[id]/alarms/route");
    const res = await POST(jsonRequest("http://test/api/sites/site-1/alarms", { method: "POST", body: { type: "fire" } }), params("site-1"));
    const body = await res.json();

    expect(body).toMatchObject({ joined: true, notified: 0 });
    const update = mockSupabaseCalls.find((c) => c.table === "site_alarms" && c.method === "update");
    expect(update?.args[0]).toMatchObject({
      additional_raisers: [expect.objectContaining({ user_id: "op-2", name: "Name op-2" })],
    });
    expect(mockSupabaseCalls.some((c) => c.table === "site_alarms" && c.method === "insert")).toBe(false);
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("pushes only people on this site and its staff, never the raiser", async () => {
    caller("op-1", "operative");
    (isStaffForSite as jest.Mock).mockResolvedValue(false);
    (currentSignedInSiteId as jest.Mock).mockResolvedValue("site-1");
    (loadActiveAlarm as jest.Mock).mockResolvedValue(null);
    mockSupabaseResponseQueue.push({ data: activeAlarm(), error: null });

    const { POST } = await import("@/app/api/sites/[id]/alarms/route");
    const res = await POST(jsonRequest("http://test/api/sites/site-1/alarms", { method: "POST", body: { type: "fire" } }), params("site-1"));

    expect(res.status).toBe(200);
    expect(userIdsSignedInAtSite).toHaveBeenCalledWith("site-1");
    expect(staffIdsForSite).toHaveBeenCalledWith("co-1", "site-1");
    const [targets, title, message] = (sendPushToUsers as jest.Mock).mock.calls[0];
    expect([...targets].sort()).toEqual(["op-2", "sup-1"]);
    expect(title).toMatch(/fire/i);
    expect(message).toContain("Op One");
  });

  it("does not let an operative start a drill", async () => {
    caller("op-1", "operative");
    (isStaffForSite as jest.Mock).mockResolvedValue(false);
    (currentSignedInSiteId as jest.Mock).mockResolvedValue("site-1");

    const { POST } = await import("@/app/api/sites/[id]/alarms/route");
    const res = await POST(
      jsonRequest("http://test/api/sites/site-1/alarms", { method: "POST", body: { type: "fire", isDrill: true } }),
      params("site-1"),
    );

    expect(res.status).toBe(403);
  });
});

describe("POST /api/alarms/[id]/stand-down", () => {
  it("refuses anyone who is not staff for the site", async () => {
    caller("op-1", "operative");
    (loadAlarm as jest.Mock).mockResolvedValue(activeAlarm());
    (isStaffForSite as jest.Mock).mockResolvedValue(false);

    const { POST } = await import("@/app/api/alarms/[id]/stand-down/route");
    const res = await POST(
      jsonRequest("http://test/api/alarms/x/stand-down", { method: "POST", body: { reason: "All clear" } }),
      params(activeAlarm().id),
    );

    expect(res.status).toBe(403);
    expect(mockSupabaseCalls.some((c) => c.method === "update")).toBe(false);
  });

  it("lets staff stand down with a reason and sends the all-clear", async () => {
    caller("sup-1", "supervisor");
    (loadAlarm as jest.Mock).mockResolvedValue(activeAlarm());
    (isStaffForSite as jest.Mock).mockResolvedValue(true);
    mockSupabaseResponseQueue.push({
      data: activeAlarm({ status: "stood_down", stood_down_by_name: "Name sup-1", stood_down_at: new Date().toISOString() }),
      error: null,
    });

    const { POST } = await import("@/app/api/alarms/[id]/stand-down/route");
    const res = await POST(
      jsonRequest("http://test/api/alarms/x/stand-down", { method: "POST", body: { reason: "Burnt toast", outcome: "false_alarm" } }),
      params(activeAlarm().id),
    );

    expect(res.status).toBe(200);
    const update = mockSupabaseCalls.find((c) => c.method === "update");
    expect(update?.args[0]).toMatchObject({ status: "stood_down", stand_down_reason: "Burnt toast", outcome: "false_alarm" });
    const [targets] = (sendPushToUsers as jest.Mock).mock.calls[0];
    expect(targets).not.toContain("sup-1");
    expect([...targets].sort()).toEqual(["op-1", "op-2"]);
  });

  it("asks for a reason", async () => {
    caller("sup-1", "supervisor");
    (loadAlarm as jest.Mock).mockResolvedValue(activeAlarm());
    (isStaffForSite as jest.Mock).mockResolvedValue(true);

    const { POST } = await import("@/app/api/alarms/[id]/stand-down/route");
    const res = await POST(jsonRequest("http://test/api/alarms/x/stand-down", { method: "POST", body: {} }), params(activeAlarm().id));

    expect(res.status).toBe(400);
  });
});
