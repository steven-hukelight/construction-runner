import PageHeader from "../../components/PageHeader";
import RAMSTable from "../../rams/RAMSTable";
import RAMSUploadModal from "../../rams/RAMSUploadModal";
import { fetchRAMS } from "../../rams/actions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

export default async function RAMSPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">You must impersonate a company to view RAMS.</p>
        <p className="text-gray-500">Use the sidebar to select a company to impersonate.</p>
      </div>
    );
  }

  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const rams = await fetchRAMS(companyId ?? undefined, cookieHeader);

  return (
    <div className="relative space-y-8">
      <div className="absolute top-40 left-20 w-80 h-80 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full blur-3xl -z-10" />
      <PageHeader
        title="RAMS"
        description="Risk Assessments & Method Statements. Manage RAMS documents across your sites."
        action={<RAMSUploadModal />}
      />
      <RAMSTable data={rams} />
    </div>
  );
}
