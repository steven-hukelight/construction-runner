import PageHeader from "../components/PageHeader";
import SitesTable from "./SitesTable";
import AddSiteModal from "./AddSiteModal";
import { fetchSites } from "./actions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";

export default async function SitesPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">You must impersonate a company to view the Sites page.</p>
        <p className="text-gray-500">Use the sidebar to select a company to impersonate.</p>
      </div>
    );
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
    <div className="relative space-y-8">
      {/* Decorative background */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />
      
      <PageHeader
        title="Sites"
        description="Manage all active sites in your organisation."
      />

      <AddSiteModal />

      <SitesTable data={tableData} />
    </div>
  );
}
