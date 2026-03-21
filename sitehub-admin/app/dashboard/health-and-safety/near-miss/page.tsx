import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import NearMissManager from "./NearMissManager";
import AddNearMissModal from "./AddNearMissModal";

export const dynamic = "force-dynamic";

export default async function NearMissPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">Impersonate a company to view near miss reports.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Near Miss"
        description="Safety incidents that didn't result in injury. Review and track reports."
        action={<AddNearMissModal />}
      />
      <NearMissManager />
    </div>
  );
}
