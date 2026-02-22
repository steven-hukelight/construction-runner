import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { getPreInductionData } from "./server";
import PreInductionSummaryCard from "./components/PreInductionSummaryCard";
import PreInductionOverrideToggle from "./components/PreInductionOverrideToggle";
import PreInductionLayoutWithRefresh from "./components/PreInductionLayoutWithRefresh";

export const dynamic = "force-dynamic";

function computeIndicators(sections: Record<string, Record<string, unknown> | null>) {
  const rtw = sections.rightToWork;
  const rtwVerified = !!rtw?.rightToWorkVerified;
  const rtwHasData = !!(rtw?.passportUrl || rtw?.visaUrl || rtw?.shareCode);
  const rightToWork: "Pending" | "Verified" | "Missing" = rtwVerified
    ? "Verified"
    : rtwHasData
      ? "Pending"
      : "Missing";

  const competencyCard = sections.competencyCard;
  const competencyCardComplete = !!(competencyCard && (competencyCard.card_number ?? competencyCard.cardNumber ?? competencyCard.file_url ?? competencyCard.fileUrl));
  const competencyDisplay = competencyCardComplete ? "Complete" : "—";

  const med = sections.medical;
  const medicalVerified = !!med?.medicalVerified;
  const medicalHasData = !!(med?.medicalDeclaration || med?.medicalCertificateUrl || med?.fitToWork != null);
  const medical: "Pending" | "Verified" | "Missing" = medicalVerified
    ? "Verified"
    : medicalHasData
      ? "Pending"
      : "Missing";

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
      <PreInductionLayoutWithRefresh userId={userId} sections={data.sections} />
    </div>
  );
}
