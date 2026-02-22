/**
 * RLS tests for tasks table.
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import {
  getServiceClient,
  seedRlsTestData,
  getClientAsUser,
  USER_A,
  USER_B,
  SUPERUSER,
  COMPANY_A_ID,
  COMPANY_B_ID,
  SITE_A_ID,
  SITE_B_ID,
} from "./helpers";

const TASK_A_ID = "rls-task-a";
const TASK_B_ID = "rls-task-b";

const runRls = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.SUPABASE_URL;
(runRls ? describe : describe.skip)("RLS: tasks", () => {
  beforeAll(async () => {
    const service = getServiceClient();
    if (!service) {
      console.warn("Skipping RLS tasks tests: SUPABASE_SERVICE_ROLE_KEY not set");
      return;
    }
    await seedRlsTestData(service);
    const { data: userA } = await service.from("users").select("id").eq("company_id", COMPANY_A_ID).limit(1).single();
    if (userA) {
      await service.from("tasks").upsert(
        [
          { id: TASK_A_ID, company_id: COMPANY_A_ID, site_id: SITE_A_ID, assigned_to: userA.id, title: "Task A", description: "Desc", status: "pending" },
          { id: TASK_B_ID, company_id: COMPANY_B_ID, site_id: SITE_B_ID, title: "Task B", description: "Desc", status: "pending" },
        ],
        { onConflict: "id" }
      );
    }
  });

  it("user from company A cannot read company B tasks", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("tasks").select("id").eq("company_id", COMPANY_B_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(0);
  });

  it("user from company A can read own company tasks", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("tasks").select("id,company_id").eq("company_id", COMPANY_A_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.every((r) => r.company_id === COMPANY_A_ID)).toBe(true);
  });

  it("superuser can read all tasks", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientSuper = await getClientAsUser(SUPERUSER);
    const { data, error } = await clientSuper.from("tasks").select("id,company_id");

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    const companyIds = [...new Set(data!.map((r) => r.company_id).filter(Boolean))];
    expect(companyIds).toContain(COMPANY_A_ID);
    expect(companyIds).toContain(COMPANY_B_ID);
  });

  it("RLS blocks insert when company_id does not match user company", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { error } = await clientA.from("tasks").insert({
      id: "rls-forbidden-task",
      company_id: COMPANY_B_ID,
      site_id: SITE_B_ID,
      title: "Forbidden",
      description: "Desc",
      status: "pending",
    });

    expect(error).not.toBeNull();
  });

  it("RLS blocks update of other company task", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { error } = await clientA.from("tasks").update({ title: "hacked" }).eq("id", TASK_B_ID);

    expect(error).not.toBeNull();
  });
});
