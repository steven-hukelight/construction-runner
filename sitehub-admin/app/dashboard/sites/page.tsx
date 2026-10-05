import PageHeader from "../components/PageHeader";
import SitesTable from "./SitesTable";
import { fetchSites } from "./actions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import { canCreateAndAssignSites } from "@/lib/auth/roles";
import SuperuserCompanyGate from "../components/SuperuserCompanyGate";

export default async function SitesPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Sites" description="Select a company to view and manage sites." />;
  }

  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    try {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    } catch (e) {
      console.error("Sites page resolveCompanyId:", e);
      companyId = undefined;
    }
  }
  let sites: Awaited<ReturnType<typeof fetchSites>> = [];
  try {
    sites = await fetchSites(companyId);
  } catch (e) {
    console.error("Sites page fetchSites:", e);
  }
  const sitesList = Array.isArray(sites) ? sites : [];
  let tableData: typeof sitesList = [];
  try {
    tableData = deepSerializeForClient(sitesList);
  } catch (e) {
    console.error("Sites page deepSerializeForClient:", e);
    try {
      tableData = JSON.parse(JSON.stringify(sitesList)) as typeof sitesList;
    } catch {
      tableData = [];
    }
  }

  return (
    <div className="relative min-w-0 space-y-5">
      <PageHeader
        compact
        title="Sites"
        description="Locations, geofences, and who manages each site."
      />

      <SitesTable
        data={tableData}
        canCreate={canCreateAndAssignSites(role)}
        canAssignManager={canCreateAndAssignSites(role)}
      />
    </div>
  );
}
