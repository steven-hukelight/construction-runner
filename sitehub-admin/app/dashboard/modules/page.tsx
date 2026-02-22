import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import PageHeader from "../components/PageHeader";
import ModulesContent from "./ModulesContent";
import ModulesCompanySelector from "./ModulesCompanySelector";

export default async function ModulesPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="relative space-y-8">
        <PageHeader
          title="Modules"
          description="Select a company to use Messaging, Asset Management, and Offline Working."
        />
        <ModulesCompanySelector />
      </div>
    );
  }

  let companyId = cookieStore.get("companyId")?.value?.trim();
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">No Company</h1>
        <p className="text-gray-500">You need to be associated with a company to use these modules.</p>
      </div>
    );
  }

  const canDelete = ["admin", "superuser", "supervisor", "sub_admin"].includes((role ?? "").toLowerCase());

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Modules"
        description="Messaging, asset management, and offline sync for your company."
      />
      <ModulesContent companyId={companyId} canDeleteMessages={canDelete} />
    </div>
  );
}
