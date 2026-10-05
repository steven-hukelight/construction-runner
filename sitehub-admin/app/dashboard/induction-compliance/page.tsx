import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { getComplianceData } from "./server";
import ComplianceClient from "./components/ComplianceClient";
import SuperuserSelfOverrideBlock from "./components/SuperuserSelfOverrideBlock";
import SuperuserCompanyGate from "@/app/dashboard/components/SuperuserCompanyGate";
import { preInductionUiEnabled } from "@/lib/featureFlags";

export default async function InductionCompliancePage() {
  // Induction compliance is largely a Pre-Induction dashboard; when the
  // feature is hidden site-wide, send users somewhere useful. All backing
  // data still exists, flip `preInductionUiEnabled` back to `true` to
  // restore the page.
  if (!preInductionUiEnabled) {
    redirect("/dashboard");
  }
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return (
      <div className="space-y-6">
        <SuperuserSelfOverrideBlock />
        <SuperuserCompanyGate
          title="Induction compliance"
          description="Select a company to view induction status across users and sites."
        />
      </div>
    );
  }

  let data;
  try {
    data = await getComplianceData({ role, companyId });
  } catch (err) {
    console.error("Induction compliance getComplianceData error:", err);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Induction compliance"
          description="Induction status across users and sites."
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-medium">Failed to load compliance data</p>
          <p className="text-sm mt-1">Please try again or contact support if the problem persists.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Induction compliance"
          description="Induction status across users and sites."
        />
        <p className="text-gray-600">No company selected or access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Induction compliance"
        description="Induction status for all users across all sites. Filter by status, company, trade, site, or expiry. Click a row to view full details."
      />
      {(role === "superuser" || role === "admin" || role === "ADMIN") && <SuperuserSelfOverrideBlock />}
      <ComplianceClient
        sites={data.sites}
        companyOptions={data.companyOptions}
        tradeOptions={data.tradeOptions}
        roleOptions={data.roleOptions}
        rows={data.rows}
        role={role}
      />
    </div>
  );
}
