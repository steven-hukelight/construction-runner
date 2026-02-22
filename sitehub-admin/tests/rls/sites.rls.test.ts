/**
 * RLS tests for sites table.
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

const runRls = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.SUPABASE_URL;
(runRls ? describe : describe.skip)("RLS: sites", () => {
  beforeAll(async () => {
    const service = getServiceClient();
    if (!service) {
      console.warn("Skipping RLS sites tests: SUPABASE_SERVICE_ROLE_KEY not set");
      return;
    }
    await seedRlsTestData(service);
  });

  it("user from company A cannot read company B sites", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("sites").select("id").eq("company_id", COMPANY_B_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(0);
  });

  it("user from company A can read own company sites", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("sites").select("id,company_id").eq("company_id", COMPANY_A_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((r) => r.company_id === COMPANY_A_ID)).toBe(true);
  });

  it("superuser can read all sites", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientSuper = await getClientAsUser(SUPERUSER);
    const { data, error } = await clientSuper.from("sites").select("id,company_id");

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
    const { error } = await clientA.from("sites").insert({
      id: "rls-forbidden-site",
      company_id: COMPANY_B_ID,
      name: "Forbidden Site",
      active: true,
    });

    expect(error).not.toBeNull();
  });

  it("RLS blocks update of other company site", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { error } = await clientA.from("sites").update({ name: "hacked" }).eq("id", SITE_B_ID);

    expect(error).not.toBeNull();
  });
});
