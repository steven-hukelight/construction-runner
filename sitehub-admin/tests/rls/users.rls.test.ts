/**
 * RLS tests for users table.
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import {
  getServiceClient,
  seedRlsTestData,
  getClientAsUser,
  USER_A,
  SUPERUSER,
  COMPANY_A_ID,
  COMPANY_B_ID,
} from "./helpers";

const runRls = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.SUPABASE_URL;
(runRls ? describe : describe.skip)("RLS: users", () => {
  beforeAll(async () => {
    const service = getServiceClient();
    if (!service) {
      console.warn("Skipping RLS users tests: SUPABASE_SERVICE_ROLE_KEY not set");
      return;
    }
    await seedRlsTestData(service);
  });

  it("user from company A cannot read company B users", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data: companyBUsers, error } = await clientA.from("users").select("id").eq("company_id", COMPANY_B_ID);

    expect(error).toBeNull();
    expect(Array.isArray(companyBUsers)).toBe(true);
    expect(companyBUsers?.length).toBe(0);
  });

  it("user from company A can read own company users", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("users").select("id,company_id").eq("company_id", COMPANY_A_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((r) => r.company_id === COMPANY_A_ID)).toBe(true);
  });

  it("superuser can read all users", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientSuper = await getClientAsUser(SUPERUSER);
    const { data, error } = await clientSuper.from("users").select("id,company_id");

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    const companyIds = [...new Set(data!.map((r) => r.company_id))];
    expect(companyIds).toContain(COMPANY_A_ID);
    expect(companyIds).toContain(COMPANY_B_ID);
  });

  it("RLS blocks insert when company_id does not match user company", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { error } = await clientA.from("users").insert({
      company_id: COMPANY_B_ID,
      email: "forbidden@test.com",
      role: "operative",
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/policy|violates|row level/i);
  });

  it("RLS blocks update of other company user", async () => {
    const service = getServiceClient();
    if (!service) return;

    const { data: targetUser } = await service.from("users").select("id").eq("company_id", COMPANY_B_ID).limit(1).single();
    if (!targetUser) return;

    const clientA = await getClientAsUser(USER_A);
    const { error } = await clientA.from("users").update({ display_name: "hacked" }).eq("id", targetUser.id);

    expect(error).not.toBeNull();
  });
});
