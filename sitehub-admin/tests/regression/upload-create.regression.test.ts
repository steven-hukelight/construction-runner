/**
 * Comprehensive upload/create regression tests for admin items:
 * Briefings, RAMs, COSHH, Tasks, Near Miss, Deliveries.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"));
jest.mock("@/lib/auditLog", () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/onesignal", () => ({ sendPushToUsers: jest.fn().mockResolvedValue(undefined) }));

import { setMockCookies, clearMockCookies, jsonRequest } from "./helpers";
import { mockSupabaseResponseQueue } from "../mocks/supabase";

const companyId = "test-company-id";
const siteId = "site-123";

function setupAuth() {
  clearMockCookies();
  mockSupabaseResponseQueue.length = 0;
  setMockCookies({
    role: "admin",
    companyId,
    uid: "test-uid",
    user_email: "admin@test.com",
  });
}

describe("Upload/Create regression tests", () => {
  beforeEach(setupAuth);

  describe("Briefings upload", () => {
    it("should upload briefing with file", async () => {
      mockSupabaseResponseQueue.push(
        { data: [{ id: "user-1" }], error: null },
        { data: { id: "briefing-1" }, error: null },
        { data: [{ id: "u1" }, { id: "u2" }], error: null }
      );

      const file = new Blob(["briefing content"], { type: "application/pdf" });
      const form = new FormData();
      form.append("file", file, "briefing.pdf");
      form.append("title", "Safety briefing");
      form.append("siteId", siteId);

      const { POST } = await import("@/app/api/briefings/upload/route");
      const req = new Request("http://test/api/briefings/upload", {
        method: "POST",
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should reject briefing without file", async () => {
      const form = new FormData();
      form.append("title", "No file");
      const { POST } = await import("@/app/api/briefings/upload/route");
      const req = new Request("http://test/api/briefings/upload", {
        method: "POST",
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("RAMs upload", () => {
    it("should upload RAMS document", async () => {
      mockSupabaseResponseQueue.push(
        { data: { id: "rams-1" }, error: null }
      );

      const file = new Blob(["RAMS content"], { type: "application/pdf" });
      const form = new FormData();
      form.append("file", file, "rams.pdf");
      form.append("siteId", siteId);

      const { POST } = await import("@/app/api/rams/upload/route");
      const req = new Request("http://test/api/rams/upload", {
        method: "POST",
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("COSHH create", () => {
    it("should create COSHH record", async () => {
      mockSupabaseResponseQueue.push(
        { data: { id: "coshh-1" }, error: null }
      );

      const { POST } = await import("@/app/api/coshh/route");
      const req = jsonRequest("http://test/api/coshh", {
        method: "POST",
        body: {
          title: "Test substance",
          substance: "Chemical X",
          hazardSymbols: ["corrosive"],
          ppe: "Gloves, goggles",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBeDefined();
    });

    it("should reject without company", async () => {
      clearMockCookies();
      setMockCookies({ role: "admin", uid: "u1", user_email: "u@test.com" });

      const { POST } = await import("@/app/api/coshh/route");
      const req = jsonRequest("http://test/api/coshh", {
        method: "POST",
        body: { title: "Test" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Tasks create", () => {
    it("should create task", async () => {
      mockSupabaseResponseQueue.push(
        { data: { id: "task-1" }, error: null }
      );

      const { POST } = await import("@/app/api/tasks/route");
      const req = jsonRequest("http://test/api/tasks", {
        method: "POST",
        body: {
          title: "Test task",
          description: "Description",
          status: "OPEN",
          companyId,
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBeDefined();
    });

    it("should list tasks with company filter", async () => {
      mockSupabaseResponseQueue.push({
        data: [
          {
            id: "t1",
            title: "Task 1",
            company_id: companyId,
            site_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const { GET } = await import("@/app/api/tasks/route");
      const req = new Request(`http://test/api/tasks?companyId=${companyId}`);
      const res = await GET(req);
      expect(res.status).toBe(200);
      const list = await res.json();
      expect(Array.isArray(list)).toBe(true);
    });
  });

  describe("Near miss create", () => {
    it("should create near miss report", async () => {
      mockSupabaseResponseQueue.push({
        data: { id: "nm-1" },
        error: null,
      });

      const { POST } = await import("@/app/api/near-miss/route");
      const req = jsonRequest("http://test/api/near-miss", {
        method: "POST",
        body: {
          description: "Trip hazard near entrance",
          siteId,
          status: "pending",
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBeDefined();
    });

    it("should require company", async () => {
      clearMockCookies();
      setMockCookies({ role: "user", uid: "u1", user_email: "u@test.com" });

      const { POST } = await import("@/app/api/near-miss/route");
      const req = jsonRequest("http://test/api/near-miss", {
        method: "POST",
        body: { description: "Test" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Deliveries create", () => {
    it("should create delivery", async () => {
      mockSupabaseResponseQueue.push({
        data: { id: "del-1" },
        error: null,
      });

      const { POST } = await import("@/app/api/deliveries/route");
      const req = jsonRequest("http://test/api/deliveries", {
        method: "POST",
        body: {
          reference: "DEL-001",
          site_id: siteId,
          status: "PENDING",
          scheduled_at: new Date().toISOString(),
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBeDefined();
    });

    it("should require company", async () => {
      clearMockCookies();
      setMockCookies({ role: "admin", uid: "u1", user_email: "u@test.com" });

      const { POST } = await import("@/app/api/deliveries/route");
      const req = jsonRequest("http://test/api/deliveries", {
        method: "POST",
        body: { reference: "DEL-001" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Sites create", () => {
    it("should create site", async () => {
      mockSupabaseResponseQueue.push(
        { data: { id: "site-new" }, error: null }
      );

      const { POST } = await import("@/app/api/sites/route");
      const req = jsonRequest("http://test/api/sites", {
        method: "POST",
        body: {
          name: "New site",
          address: "123 Test St",
          company_id: companyId,
        },
      });
      const res = await POST(req);
      expect([200, 201]).toContain(res.status);
      const json = await res.json();
      expect(json.id ?? json.data?.id).toBeDefined();
    });
  });

  describe("Safety alerts create", () => {
    it("should create safety alert", async () => {
      mockSupabaseResponseQueue.push({
        data: { id: "alert-1" },
        error: null,
      });

      const { POST } = await import("@/app/api/safety-alerts/route");
      const req = jsonRequest("http://test/api/safety-alerts", {
        method: "POST",
        body: {
          title: "Safety alert",
          description: "Urgent safety notice",
          severity: "high",
        },
      });
      const res = await POST(req);
      expect([200, 201]).toContain(res.status);
    });
  });
});
