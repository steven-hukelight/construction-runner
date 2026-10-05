import PageHeader from "../components/PageHeader";
import SubcontractorsList from "./SubcontractorsList";
import { cookies } from "next/headers";
import SuperuserCompanyGate from "../components/SuperuserCompanyGate";

export default async function SubcontractorsPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Subcontractors" description="Select a company to view subcontractors." />;
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Subcontractors"
        description="Partner companies linked to your sites. Invite and manage subcontractors."
      />
      <SubcontractorsList />
    </div>
  );
}
