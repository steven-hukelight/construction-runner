import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import SiteRulesManager from "./SiteRulesManager";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";

export const dynamic = "force-dynamic";

export default async function SiteRulesPage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Site rules" description="Select a company to manage site rules." />;
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Company Required</h1>
        <p className="mb-6">Select a company to manage site rules.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Site rules"
        description="Per-site PPE, emergency, and conduct rules with optional attachments. Operatives accept these after the safety pack and RAMS. Not the company safety pack, that lives under Induction safety."
      />
      <SiteRulesManager />
    </div>
  );
}
