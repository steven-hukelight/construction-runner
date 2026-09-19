import PageHeader from "../components/PageHeader";
import DeliveriesTable from "./DeliveriesTable";
import AddDeliveryModal from "./AddDeliveryModal";
import HaulageManager from "./HaulageManager";
import { fetchDeliveries } from "./actions";
import { deepSerializeForClient } from "@/lib/rscSerialize";

export default async function DeliveriesPage() {
  const deliveries = await fetchDeliveries();

  return (
    <div className="relative space-y-8">
      {/* Decorative background */}
      
      <PageHeader
        title="Deliveries"
        description="Track site deliveries and received items."
        action={<AddDeliveryModal />}
      />

      <HaulageManager />

      <DeliveriesTable data={deepSerializeForClient(deliveries)} />
    </div>
  );
}
