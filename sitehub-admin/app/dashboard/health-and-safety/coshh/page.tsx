import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import COSHHTemplate from "./COSHHTemplate";

export const dynamic = "force-dynamic";

export default async function COSHHPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">Impersonate a company to manage COSHH assessments.</p>
      </div>
    );
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
