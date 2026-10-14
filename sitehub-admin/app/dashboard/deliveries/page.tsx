import { cookies } from "next/headers";
import PageHeader from "../components/PageHeader";
import SuperuserCompanyGate from "../components/SuperuserCompanyGate";
import DeliveriesTable from "./DeliveriesTable";
import AddDeliveryModal from "./AddDeliveryModal";
import HaulageManager from "./HaulageManager";
import { fetchDeliveries } from "./actions";
import { deepSerializeForClient } from "@/lib/rscSerialize";

export default async function DeliveriesPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";
  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Deliveries" description="Select a company to view deliveries." />;
  }

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
