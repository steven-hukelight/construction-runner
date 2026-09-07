import { deepSerializeForClient } from "@/lib/rscSerialize";
import { fetchSite } from "./server";
import EditSiteForm from "./EditSiteForm";

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await fetchSite(id);

  if (!site) return null;

  return <EditSiteForm site={deepSerializeForClient(site)} />;
}
