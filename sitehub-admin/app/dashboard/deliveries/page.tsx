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
      <div className="absolute top-32 right-32 w-72 h-72 bg-gradient-to-br from-orange-400/10 to-amber-400/10 rounded-full blur-3xl -z-10" />
      
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
