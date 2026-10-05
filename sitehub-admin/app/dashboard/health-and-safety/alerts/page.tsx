import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import SafetyAlertsManager from "./SafetyAlertsManager";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";

export const dynamic = "force-dynamic";

export default async function SafetyAlertsPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Alerts" description="Select a company to manage safety alerts." />;
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Safety alerts"
        description="Site safety alerts with severity levels: info, warning, critical."
      />
      <SafetyAlertsManager />
    </div>
  );
}
