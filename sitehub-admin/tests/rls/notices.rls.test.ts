/**
 * RLS tests for notices table.
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

const NOTICE_A_ID = "rls-notice-a";
const NOTICE_B_ID = "rls-notice-b";

const runRls = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.SUPABASE_URL;
(runRls ? describe : describe.skip)("RLS: notices", () => {
  beforeAll(async () => {
    const service = getServiceClient();
    if (!service) {
      console.warn("Skipping RLS notices tests: SUPABASE_SERVICE_ROLE_KEY not set");
      return;
    }
    await seedRlsTestData(service);
    await service.from("notices").upsert(
      [
        { id: NOTICE_A_ID, company_id: COMPANY_A_ID, title: "Notice A", body: "Body A" },
        { id: NOTICE_B_ID, company_id: COMPANY_B_ID, title: "Notice B", body: "Body B" },
      ],
      { onConflict: "id" }
    );
  });

  it("user from company A cannot read company B notices", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("notices").select("id").eq("company_id", COMPANY_B_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(0);
  });

  it("user from company A can read own company notices", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { data, error } = await clientA.from("notices").select("id,company_id").eq("company_id", COMPANY_A_ID);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.every((r) => r.company_id === COMPANY_A_ID)).toBe(true);
  });

  it("superuser can read all notices", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientSuper = await getClientAsUser(SUPERUSER);
    const { data, error } = await clientSuper.from("notices").select("id,company_id");

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
    const { error } = await clientA.from("notices").insert({
      id: "rls-forbidden-notice",
      company_id: COMPANY_B_ID,
      title: "Forbidden",
      body: "Body",
    });

    expect(error).not.toBeNull();
  });

  it("RLS blocks update of other company notice", async () => {
    const service = getServiceClient();
    if (!service) return;

    const clientA = await getClientAsUser(USER_A);
    const { error } = await clientA.from("notices").update({ title: "hacked" }).eq("id", NOTICE_B_ID);

    expect(error).not.toBeNull();
  });
});
