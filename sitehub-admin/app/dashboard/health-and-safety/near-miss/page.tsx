import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import NearMissManager from "./NearMissManager";
import AddNearMissModal from "./AddNearMissModal";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";

export const dynamic = "force-dynamic";

export default async function NearMissPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Near miss" description="Select a company to view near miss reports." />;
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Near miss"
        description="Safety incidents that didn't result in injury. Review and track reports."
        action={<AddNearMissModal />}
      />
      <NearMissManager />
    </div>
  );
}
