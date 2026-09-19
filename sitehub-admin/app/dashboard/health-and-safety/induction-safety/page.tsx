import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import CompanySafetyPackClient from "./CompanySafetyPackClient";
import { canEditCompanySafetyPack } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function InductionSafetyPage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">Impersonate a company to edit the default safety pack.</p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Company Required</h1>
        <p className="mb-6">Select a company to manage induction safety information.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Induction safety"
        description="Company default safety pack (PPE, emergency, welfare, access, hazards). Copied onto each new site and shown first in induction. This is not the same as Site rules — those are discrete per-site rules accepted later in the flow. Edit a site’s copy under Sites → Safety info."
      />
      <CompanySafetyPackClient canEdit={canEditCompanySafetyPack(role)} />
    </div>
  );
}
