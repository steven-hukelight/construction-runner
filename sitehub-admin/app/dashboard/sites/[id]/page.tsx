import PageHeader from "../../components/PageHeader";
import { fetchSite } from "./server";
import SiteDetailTabs from "./SiteDetailTabs";

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await fetchSite(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={site?.name ?? "Edit Site"}
        description="Update site details, location, geofence and subcontractors."
      />

      <SiteDetailTabs site={site} />
    </div>
  );
}
