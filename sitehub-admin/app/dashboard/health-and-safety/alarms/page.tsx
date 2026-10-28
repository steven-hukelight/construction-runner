import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";
import AlarmsHistoryClient from "./AlarmsHistoryClient";

export const dynamic = "force-dynamic";

export default async function AlarmsHistoryPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Alarms" description="Select a company to view alarm and drill history." />;
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Alarms and drills"
        description="Who raised each alarm, who stood it down, and a muster record you can export for fire-drill audits."
      />
      <AlarmsHistoryClient />
    </div>
  );
}
