import { cookies } from "next/headers";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { getSiteInductionData } from "./server";
import SiteInductionClient from "./components/SiteInductionClient";

export default async function SiteInductionPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;

  const data = await getSiteInductionData(params.id, { role, companyId });

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Site Induction Overview"
          description="Site not found or you don’t have access."
        />
        <p className="text-gray-600">Site not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Induction Overview"
        description={`Induction status for operatives assigned to ${data.site.name}.`}
      />
      <SiteInductionClient
        siteId={data.site.id}
        siteName={data.site.name}
        operatives={data.operatives}
        companyOptions={data.companyOptions}
      />
    </div>
  );
}
