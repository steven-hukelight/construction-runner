import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import SuperuserCompanyGate from "@/app/dashboard/components/SuperuserCompanyGate";
import MissingInfoTable from "./MissingInfoTable";

/**
 * Missing info report. Replaces the deleted `/dashboard/induction-compliance`
 * page. Shows workers in the caller's company whose emergency contact or
 * medical info is not yet filled in. Filter, search, CSV export.
 */
export default async function MissingInfoPage() {
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Missing info" description="Select a company to see workers with missing details." />;
  }

  const isPrivilegedRole = ["admin", "supervisor", "superuser"].includes(role);
  if (!isPrivilegedRole) {
    return (
      <div className="space-y-6">
        <PageHeader title="Missing info" description="Access denied. Admin, supervisor or superuser role required." />
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missing info"
        description="Workers missing an emergency contact or medical info."
      />
      <MissingInfoTable />
    </div>
  );
}
