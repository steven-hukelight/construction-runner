import PageHeader from "../../components/PageHeader";
import { fetchSite } from "./server";
import SiteDetailTabBar from "./SiteDetailTabBar";

export const dynamic = "force-dynamic";

export default async function SiteDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await fetchSite(id);

  if (!site) {
    return (
      <div className="space-y-6">
        <PageHeader title="Site" description="Site not found." />
        <p className="text-gray-600">Site not found or access denied.</p>
        {children}
      </div>
    );
  }

  const title =
    site.name != null && site.name !== ""
      ? String(site.name)
      : "Site Management";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Manage site details, subcontractors, operatives, and induction."
      />
      <SiteDetailTabBar siteId={id} />
      {children}
    </div>
  );
}
