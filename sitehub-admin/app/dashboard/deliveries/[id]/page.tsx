import PageHeader from "../../components/PageHeader";
import DeliveryDetailClient from "./DeliveryDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DeliveryDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Delivery Details"
        description="View POD, load photos, and update delivery status."
      />
      <DeliveryDetailClient deliveryId={id} />
    </div>
  );
}
