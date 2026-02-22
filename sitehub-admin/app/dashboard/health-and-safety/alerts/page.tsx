import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import SafetyAlertsManager from "./SafetyAlertsManager";

export const dynamic = "force-dynamic";

export default async function SafetyAlertsPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">Impersonate a company to manage safety alerts.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-red-400/10 to-rose-400/10 rounded-full blur-3xl -z-10" />
      <PageHeader
        title="Safety Alerts"
        description="Site safety alerts with severity levels: info, warning, critical."
      />
      <SafetyAlertsManager />
    </div>
  );
}
