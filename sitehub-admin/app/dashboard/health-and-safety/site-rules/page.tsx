import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import SiteRulesManager from "./SiteRulesManager";

export const dynamic = "force-dynamic";

export default async function SiteRulesPage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">Impersonate a company to manage site rules.</p>
      </div>
    );
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
      <div className="absolute top-40 left-1/2 w-80 h-80 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl -z-10" />
      <PageHeader
        title="Site Rules"
        description="PPE requirements, emergency procedures, and conduct rules. Editable by admin."
      />
      <SiteRulesManager />
    </div>
  );
}
