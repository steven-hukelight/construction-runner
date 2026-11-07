import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";
import TrainingClient from "./TrainingClient";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Training" description="Select a company to manage training." />;
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Training"
        description="Awareness videos with a short quiz, face fit records, and campaign links. A pass is an awareness module, not a qualification."
      />
      <TrainingClient />
    </div>
  );
}
