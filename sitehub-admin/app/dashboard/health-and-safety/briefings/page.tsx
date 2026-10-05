import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import BriefingsTable from "./BriefingsTable";
import BriefingsUploadModal from "./BriefingsUploadModal";
import BriefingsDownloadReportButton from "./BriefingsDownloadReportButton";
import { fetchBriefings } from "./actions";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import SuperuserCompanyGate from "../../components/SuperuserCompanyGate";

export const dynamic = "force-dynamic";

export default async function BriefingsPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Briefings" description="Select a company to manage briefings." />;
  }

  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const briefings = await fetchBriefings(companyId ?? undefined, cookieHeader);

  const roleLower = role?.toLowerCase() ?? "";
  const canViewAcknowledgements =
    roleLower === "admin" || roleLower === "supervisor" || roleLower === "superuser";

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Briefings"
        description="Toolbox talks and site briefings. Upload PDFs for operatives to acknowledge in the app. Admins and supervisors can see who acknowledged each item and export a CSV per briefing or for all briefings."
        action={
          <>
            <BriefingsDownloadReportButton />
            <BriefingsUploadModal />
          </>
        }
      />
      <BriefingsTable
        data={deepSerializeForClient(briefings)}
        canViewAcknowledgements={canViewAcknowledgements}
        companyId={companyId ?? null}
      />
    </div>
  );
}
