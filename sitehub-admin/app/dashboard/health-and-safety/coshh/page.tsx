import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import COSHHTemplate from "./COSHHTemplate";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";

export const dynamic = "force-dynamic";

export default async function COSHHPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="COSHH" description="Select a company to manage COSHH assessments." />;
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="COSHH Assessments"
        description="Control of Substances Hazardous to Health. Manage hazard symbols and PPE requirements."
      />
      <COSHHTemplate />
    </div>
  );
}
