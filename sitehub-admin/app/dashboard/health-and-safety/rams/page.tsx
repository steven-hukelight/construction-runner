import PageHeader from "../../components/PageHeader";
import RAMSTable from "../../rams/RAMSTable";
import RAMSUploadModal from "../../rams/RAMSUploadModal";
import { fetchRAMS } from "../../rams/actions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";

export default async function RAMSPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="RAMS" description="Select a company to view RAMS." />;
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
      <PageHeader
        title="RAMS"
        description="Risk Assessments & Method Statements. Manage RAMS documents across your sites."
        action={<RAMSUploadModal />}
      />
      <RAMSTable data={deepSerializeForClient(rams)} />
    </div>
  );
}
