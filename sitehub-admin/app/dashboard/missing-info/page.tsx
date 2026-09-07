import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import MissingInfoTable from "./MissingInfoTable";

/**
 * Missing Info report. Replaces the deleted `/dashboard/induction-compliance`
 * page. Shows workers in the caller's company whose emergency contact or
 * medical info is not yet filled in. Filter, search, CSV export.
 */
export default async function MissingInfoPage() {
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();

  const isPrivilegedRole = ["admin", "supervisor", "superuser"].includes(role);
  if (!isPrivilegedRole) {
    return (
      <div className="space-y-6">
        <PageHeader title="Missing Info" description="Access denied. Admin, supervisor or superuser role required." />
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missing Info"
        description="Workers with no emergency contact and/or no medical info. Use this to chase completion — the app no longer blocks sign-in on it."
      />
      <MissingInfoTable />
    </div>
  );
}
