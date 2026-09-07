import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { getPreInductionData } from "../pre-induction/server";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import PreInductionSectionCertifications from "../pre-induction/components/PreInductionSectionCertifications";
import PreInductionSectionTraining from "../pre-induction/components/PreInductionSectionTraining";
import { preInductionUiEnabled } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

export default async function CertsTrainingPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  // Backed by pre-induction data — redirect to user profile when hidden.
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
          title="Certs & Training"
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certs & Training"
        description={`Certifications and training records for ${data.user.name ?? data.user.email ?? data.user.id}.`}
        action={
          <Link
            href={`/dashboard/operatives/${userId}`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Operative profile
          </Link>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PreInductionSectionCertifications
          userId={userId}
          data={deepSerializeForClient(data.sections.certifications)}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PreInductionSectionTraining
          userId={userId}
          data={deepSerializeForClient(data.sections.training)}
        />
      </div>
    </div>
  );
}
