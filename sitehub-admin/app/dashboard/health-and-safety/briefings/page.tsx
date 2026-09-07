import { cookies } from "next/headers";
import PageHeader from "../../components/PageHeader";
import BriefingsTable from "./BriefingsTable";
import BriefingsUploadModal from "./BriefingsUploadModal";
import BriefingsDownloadReportButton from "./BriefingsDownloadReportButton";
import { fetchBriefings } from "./actions";
import { deepSerializeForClient } from "@/lib/rscSerialize";

export const dynamic = "force-dynamic";

export default async function BriefingsPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">Impersonate a company to manage briefings.</p>
      </div>
    );
  }

  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const briefings = await fetchBriefings(companyId ?? undefined, cookieHeader);

  const roleLower = role?.toLowerCase() ?? "";
  const canViewAcknowledgements =
    roleLower === "admin" || roleLower === "supervisor" || roleLower === "superuser";

  return (
    <div className="relative space-y-8">
      <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />
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
