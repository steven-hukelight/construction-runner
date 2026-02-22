/**
 * RLS tests for deliveries table.
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
  SITE_A_ID,
  SITE_B_ID,
} from "./helpers";

const DELIVERY_A_ID = "rls-delivery-a";
const DELIVERY_B_ID = "rls-delivery-b";

const runRls = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.SUPABASE_URL;
(runRls ? describe : describe.skip)("RLS: deliveries", () => {
  beforeAll(async () => {
    const service = getServiceClient();
    if (!service) {
      console.warn("Skipping RLS deliveries tests: SUPABASE_SERVICE_ROLE_KEY not set");
      return;
    }
    await seedRlsTestData(service);
    const { data: userA } = await service.from("users").select("id").eq("company_id", COMPANY_A_ID).limit(1).single();
    const { data: userB } = await service.from("users").select("id").eq("company_id", COMPANY_B_ID).limit(1).single();
    if (userA && userB) {
      await service.from("deliveries").upsert(
        [
          { id: DELIVERY_A_ID, company_id: COMPANY_A_ID, site_id: SITE_A_ID, created_by: userA.id, status: "pending" },
          { id: DELIVERY_B_ID, company_id: COMPANY_B_ID, site_id: SITE_B_ID, created_by: userB.id, status: "pending" },
        ],
        { onConflict: "id" }
      );
    }
  });

  it("user from company A cannot read company B deliveries", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("deliveries").select("id").eq("company_id", COMPANY_B_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(0);
  });

  it("user from company A can read own company deliveries", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("deliveries").select("id,company_id").eq("company_id", COMPANY_A_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.every((r) => r.company_id === COMPANY_A_ID)).toBe(true);
  });

  it("superuser can read all deliveries", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientSuper = await getClientAsUser(SUPERUSER);
    const { data, error } = await clientSuper.from("deliveries").select("id,company_id");

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
    const { data: me } = await service.from("users").select("id").eq("email", USER_A.email).single();
    if (!me) return;

    const { error } = await clientA.from("deliveries").insert({
      id: "rls-forbidden-delivery",
      company_id: COMPANY_B_ID,
      site_id: SITE_B_ID,
      created_by: me.id,
      status: "pending",
    });

    expect(error).not.toBeNull();
  });

  it("RLS blocks update of other company delivery", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { error } = await clientA.from("deliveries").update({ status: "hacked" }).eq("id", DELIVERY_B_ID);

    expect(error).not.toBeNull();
  });
});
