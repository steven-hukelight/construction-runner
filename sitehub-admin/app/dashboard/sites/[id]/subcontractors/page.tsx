import SiteSubcontractorsTab from "../SiteSubcontractorsTab";

export default async function SiteSubcontractorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SiteSubcontractorsTab siteId={id} />;
}
