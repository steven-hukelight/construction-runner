import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { getPreInductionData } from "./server";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import PreInductionSummaryCard from "./components/PreInductionSummaryCard";
import PreInductionOverrideToggle from "./components/PreInductionOverrideToggle";
import PreInductionLayoutWithRefresh from "./components/PreInductionLayoutWithRefresh";
import { preInductionUiEnabled } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

function computeIndicators(sections: Record<string, Record<string, unknown> | null>) {
  const rtw = sections.rightToWork;
  const rtwVerified = !!rtw?.rightToWorkVerified;
  const rtwHasId = !!(rtw?.passportUrl || rtw?.visaUrl);
  const rtwHasProof = !!rtw?.proofOfAddressUrl;
  const rtwComplete = rtwVerified || (rtwHasId && rtwHasProof);
  const rtwPartial = (rtwHasId || rtwHasProof || rtw?.shareCode) && !rtwComplete;
  const rightToWork: "Pending" | "Verified" | "Missing" = rtwComplete ? "Verified" : rtwPartial ? "Pending" : "Missing";

  const competencyCard = sections.competencyCard;
  const competencyCardComplete = !!(competencyCard && (competencyCard.card_number ?? competencyCard.cardNumber ?? competencyCard.file_url ?? competencyCard.fileUrl));
  const competencyDisplay = competencyCardComplete ? "Complete" : "—";

  const med = sections.medical;
  const medicalVerified = !!med?.medicalVerified;
  const medHasIssues = med?.hasMedicalIssues ?? med?.has_medical_issues;
  const medFitToWork = med?.fitToWork;
  const medNoIssues = medHasIssues === false || medFitToWork === true || String(medFitToWork ?? "").toLowerCase() === "true";
  const medHasCert = !!med?.medicalCertificateUrl;
  const medComplete = medicalVerified || medNoIssues || medHasCert;
  const medPartial = (med?.medicalDeclaration || med?.medicalCertificateUrl || med?.fitToWork != null) && !medComplete;
  const medical: "Pending" | "Verified" | "Missing" = medComplete ? "Verified" : medPartial ? "Pending" : "Missing";

  const tr = sections.training;
  const trArr = Array.isArray(tr?.trainingRecords) ? tr.trainingRecords : [];
  const trainingRecords = trArr.length;
  const ramsAccepted = !!tr?.ramsAccepted;

  const decl = sections.declarations;
  const declarations: "Accepted" | "Not accepted" = !!decl?.operativeDeclarationAccepted
    ? "Accepted"
    : "Not accepted";

  return {
    rightToWork,
    competencyCardComplete,
    competencyDisplay,
    medical,
    trainingRecords,
    ramsAccepted,
    declarations,
  };
}

export default async function PreInductionPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  // Pre-induction UI is hidden site-wide. Send anyone landing on a direct
  // pre-induction URL back to the user record. Data + APIs remain intact.
  if (!preInductionUiEnabled) {
    const { userId: userIdEarly } = await params;
    redirect(`/dashboard/users/${userIdEarly}`);
  }
  const { userId } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;

  const data = await getPreInductionData(userId, { role, companyId });

  if (!data.user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pre-Induction Profile"
          description="User not found or you don't have access."
        />
        <Link
          href="/dashboard/users"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to users
        </Link>
      </div>
    );
  }

  const indicators = computeIndicators(data.sections);
  const canEditOverride =
    role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-Induction Profile"
        description={`Pre-Induction profile for ${data.user.name ?? data.user.email ?? data.user.id}.`}
        action={
          <Link
            href={`/dashboard/users/${userId}`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← User profile
          </Link>
        }
      />
      <PreInductionSummaryCard user={data.user} indicators={indicators} />
      <PreInductionOverrideToggle
        userId={userId}
        adminPreInductionOverride={data.user.adminPreInductionOverride}
        canEdit={canEditOverride}
      />
      <PreInductionLayoutWithRefresh userId={userId} sections={deepSerializeForClient(data.sections)} />
    </div>
  );
}
