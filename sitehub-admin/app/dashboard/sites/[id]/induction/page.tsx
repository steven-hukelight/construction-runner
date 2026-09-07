import { cookies } from "next/headers";
import { getSiteInductionData } from "./server";
import SiteInductionClient from "./components/SiteInductionClient";

export default async function SiteInductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;

  const data = await getSiteInductionData(id, { role, companyId });

  if (!data) {
    return <p className="text-gray-600 dark:text-slate-400">Site not found or access denied.</p>;
  }

  return (
    <SiteInductionClient
      siteId={data.site.id}
      siteName={data.site.name}
      mainContractorId={data.site.mainContractorId}
      operatives={data.operatives}
      companyOptions={data.companyOptions}
    />
  );
}
